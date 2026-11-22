import { Suspense } from 'react';
import TopBar from '@/components/TopBar';
import Editor from '@/components/Editor';

export default function Home() {
  return (
    <>
      <TopBar active="builder" />
      <Suspense fallback={<div className="page muted">Loading…</div>}>
        <Editor />
      </Suspense>
    </>
  );
}
