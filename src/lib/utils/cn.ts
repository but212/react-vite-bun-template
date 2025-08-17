/*!
 * Portions based on https://github.com/SGLara/cn
 * Copyright (c) 2023-present SGLara
 * Licensed under the MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/**
 * clsx와 tailwind-merge를 사용하여 Tailwind CSS 클래스를 병합하는 유틸리티 함수
 *
 * 이 함수는 조건부 클래스 처리를 위한 clsx의 기능과
 * 지능적인 Tailwind CSS 클래스 중복 제거를 위한 tailwind-merge의 기능을 결합합니다.
 *
 * @param inputs - 병합할 클래스 값들 (문자열, 객체, 배열 등)
 * @returns 병합되고 중복이 제거된 클래스 문자열
 *
 * @example
 * cn('px-2 py-1', 'px-4') // 반환값: 'py-1 px-4'
 * cn('text-red-500', { 'text-blue-500': true }) // 반환값: 'text-blue-500'
 *
 * @source https://github.com/SGLara/cn
 * @license MIT
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}
