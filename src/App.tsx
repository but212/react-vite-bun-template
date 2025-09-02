import { Link, Route, Routes } from 'react-router-dom';

import Launches from './components/Launches';

const Home = () => {
  return (
    <main className='container mx-auto p-4'>
      <h1 className='text-3xl font-bold'>템플릿 페이지</h1>
      <p className='text-xl'>변경사항을 적용해보세요.</p>
    </main>
  );
};

const NotFound = () => {
  return (
    <main className='p-6'>
      <h2 className='text-2xl font-semibold'>페이지를 찾을 수 없습니다</h2>
      <p className='mt-2 text-muted-foreground'>요청하신 경로가 존재하지 않아요.</p>
      <div className='mt-4'>
        <Link className='underline text-blue-600' to='/'>
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
};

const App = () => {
  return (
    <div className='min-h-screen'>
      <header className='p-4 border-b'>
        <nav className='container mx-auto flex items-center gap-4'>
          <Link className='font-semibold' to='/'>
            홈
          </Link>
          <Link className='font-semibold' to='/graphql'>
            GraphQL
          </Link>
        </nav>
      </header>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/graphql' element={<Launches />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;
