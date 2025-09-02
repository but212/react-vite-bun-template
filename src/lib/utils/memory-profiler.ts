import { createErrorMessage } from '../i18n';

/**
 * 메모리 사용량 정보
 */
export interface MemorySnapshot {
  /** 사용된 힙 메모리 (MB) */
  used: number;
  /** 총 힙 메모리 (MB) */
  total: number;
  /** 사용률 (%) */
  percentage: number;
  /** 측정 시간 */
  timestamp: number;
}

/**
 * 메모리 프로파일링 결과
 */
export interface MemoryProfile {
  /** 프로파일 이름 */
  name: string;
  /** 시작 시간 */
  startTime: number;
  /** 종료 시간 */
  endTime: number;
  /** 총 실행 시간 (ms) */
  duration: number;
  /** 초기 메모리 사용량 */
  initialMemory: MemorySnapshot;
  /** 최대 메모리 사용량 */
  peakMemory: MemorySnapshot;
  /** 최종 메모리 사용량 */
  finalMemory: MemorySnapshot;
  /** 메모리 증가량 (MB) */
  memoryDelta: number;
  /** 샘플링된 메모리 사용량 기록 */
  samples: MemorySnapshot[];
}

/**
 * 메모리 프로파일링 옵션
 */
export interface MemoryProfileOptions {
  /** 샘플링 간격 (ms) */
  samplingInterval?: number;
  /** 최대 샘플 수 */
  maxSamples?: number;
  /** 가비지 컬렉션 강제 실행 여부 */
  forceGC?: boolean;
}

/**
 * 메모리 사용량 프로파일러
 */
export class MemoryProfiler {
  private isRunning = false;
  private samplingTimer?: ReturnType<typeof setInterval>;
  private samples: MemorySnapshot[] = [];
  private startTime = 0;
  private initialMemory?: MemorySnapshot;

  /**
   * 현재 메모리 사용량을 가져옵니다
   */
  public getCurrentMemorySnapshot(): MemorySnapshot {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      // 브라우저 환경
      const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      const used = memory.usedJSHeapSize / (1024 * 1024);
      const total = memory.totalJSHeapSize / (1024 * 1024);
      return {
        used: Math.round(used * 100) / 100,
        total: Math.round(total * 100) / 100,
        percentage: Math.round((used / total) * 10000) / 100,
        timestamp: Date.now(),
      };
    } else if (typeof process !== 'undefined' && process.memoryUsage) {
      // Node.js 환경
      const memory = process.memoryUsage();
      const used = memory.heapUsed / (1024 * 1024);
      const total = memory.heapTotal / (1024 * 1024);
      return {
        used: Math.round(used * 100) / 100,
        total: Math.round(total * 100) / 100,
        percentage: Math.round((used / total) * 10000) / 100,
        timestamp: Date.now(),
      };
    } else {
      // 메모리 정보를 사용할 수 없는 환경
      return {
        used: 0,
        total: 0,
        percentage: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 가비지 컬렉션을 강제로 실행합니다 (가능한 경우)
   */
  public forceGarbageCollection(): void {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    } else if (typeof window !== 'undefined' && (window as { gc: () => void }).gc) {
      (window as { gc: () => void }).gc();
    }
  }

  /**
   * 메모리 프로파일링을 시작합니다
   */
  public startProfiling(options: MemoryProfileOptions = {}): void {
    if (this.isRunning) {
      throw new Error(createErrorMessage('memoryProfiler', 'alreadyRunning'));
    }

    const { samplingInterval = 100, maxSamples = 1000, forceGC = false } = options;

    if (forceGC) {
      this.forceGarbageCollection();
    }

    this.isRunning = true;
    this.samples = [];
    this.startTime = Date.now();
    this.initialMemory = this.getCurrentMemorySnapshot();

    // 초기 샘플 추가
    this.samples.push(this.initialMemory);

    // 주기적 샘플링 시작
    this.samplingTimer = setInterval(() => {
      if (this.samples.length >= maxSamples) {
        this.stopProfiling();
        return;
      }

      const currentMemory = this.getCurrentMemorySnapshot();
      this.samples.push(currentMemory);
    }, samplingInterval);
  }

  /**
   * 메모리 프로파일링을 중지합니다
   */
  public stopProfiling(): void {
    if (!this.isRunning) {
      throw new Error(createErrorMessage('memoryProfiler', 'notRunning'));
    }

    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = undefined;
    }

    this.isRunning = false;
  }

  /**
   * 프로파일링 결과를 가져옵니다
   */
  public getProfile(name: string): MemoryProfile {
    if (this.isRunning) {
      throw new Error(createErrorMessage('memoryProfiler', 'stillRunning'));
    }

    if (!this.initialMemory || this.samples.length === 0) {
      throw new Error(createErrorMessage('memoryProfiler', 'noData'));
    }

    const endTime = Date.now();
    const finalMemory = this.getCurrentMemorySnapshot();

    // 최대 메모리 사용량 찾기
    const peakMemory = this.samples.reduce((peak, current) => (current.used > peak.used ? current : peak));

    return {
      name,
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      initialMemory: this.initialMemory,
      peakMemory,
      finalMemory,
      memoryDelta: Math.round((finalMemory.used - this.initialMemory.used) * 100) / 100,
      samples: [...this.samples],
    };
  }

  /**
   * 함수 실행 중 메모리 사용량을 프로파일링합니다
   */
  public async profileFunction<T>(
    name: string,
    fn: () => T | Promise<T>,
    options: MemoryProfileOptions = {}
  ): Promise<{ result: T; profile: MemoryProfile }> {
    this.startProfiling(options);

    try {
      const result = await fn();
      this.stopProfiling();
      const profile = this.getProfile(name);
      return { result, profile };
    } catch (error) {
      if (this.isRunning) {
        this.stopProfiling();
      }
      throw error;
    }
  }

  /**
   * 메모리 누수를 감지합니다
   */
  public detectMemoryLeak(
    threshold: number = 10,
    windowSize: number = 10
  ): { isLeak: boolean; trend: number; samples: MemorySnapshot[] } {
    if (this.samples.length < windowSize) {
      return {
        isLeak: false,
        trend: 0,
        samples: [...this.samples],
      };
    }

    // 최근 windowSize 개의 샘플에서 메모리 증가 추세 계산
    const recentSamples = this.samples.slice(-windowSize);
    const firstSample = recentSamples[0];
    const lastSample = recentSamples[recentSamples.length - 1];

    if (!firstSample || !lastSample) {
      return {
        isLeak: false,
        trend: 0,
        samples: recentSamples,
      };
    }

    const trend = lastSample.used - firstSample.used;
    const isLeak = trend > threshold;

    return {
      isLeak,
      trend: Math.round(trend * 100) / 100,
      samples: recentSamples,
    };
  }

  /**
   * 프로파일 결과를 포맷팅합니다
   */
  public formatProfile(profile: MemoryProfile): string {
    const lines = [
      `# 메모리 프로파일: ${profile.name}`,
      '',
      `**실행 시간:** ${profile.duration.toFixed(2)}ms`,
      `**초기 메모리:** ${profile.initialMemory.used.toFixed(2)}MB (${profile.initialMemory.percentage.toFixed(1)}%)`,
      `**최대 메모리:** ${profile.peakMemory.used.toFixed(2)}MB (${profile.peakMemory.percentage.toFixed(1)}%)`,
      `**최종 메모리:** ${profile.finalMemory.used.toFixed(2)}MB (${profile.finalMemory.percentage.toFixed(1)}%)`,
      `**메모리 증가:** ${profile.memoryDelta >= 0 ? '+' : ''}${profile.memoryDelta.toFixed(2)}MB`,
      `**샘플 수:** ${profile.samples.length}개`,
      '',
    ];

    // 메모리 누수 감지 결과 추가
    const leakDetection = this.detectMemoryLeak();
    if (leakDetection.isLeak) {
      lines.push(`⚠️ **메모리 누수 의심:** +${leakDetection.trend.toFixed(2)}MB 증가 추세`);
    } else {
      lines.push('✅ **메모리 사용량 정상**');
    }

    return lines.join('\n');
  }
}

/**
 * 전역 메모리 프로파일러 인스턴스
 */
export const memoryProfiler = new MemoryProfiler();

/**
 * 간편한 메모리 프로파일링 헬퍼 함수
 */
export async function profileMemory<T>(
  name: string,
  fn: () => T | Promise<T>,
  options?: MemoryProfileOptions
): Promise<{ result: T; profile: MemoryProfile }> {
  return memoryProfiler.profileFunction(name, fn, options);
}
