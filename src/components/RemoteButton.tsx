import React, { Suspense } from 'react';

// @ts-expect-error - remote_app/Button is a virtual module provided by Module Federation.
const RemoteButton = React.lazy(() => import('remote_app/Button'));

const RemoteComponentLoader = () => {
  return (
    <div>
      <h2 className='text-xl font-bold mb-4'>Micro-frontend Component</h2>
      <Suspense fallback={<div>Loading Remote Button...</div>}>
        <RemoteButton />
      </Suspense>
    </div>
  );
};

export default RemoteComponentLoader;
