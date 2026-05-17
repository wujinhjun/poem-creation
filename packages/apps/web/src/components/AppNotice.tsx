export function AppNotice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className='mx-auto mt-4 w-[min(1180px,calc(100%-32px))] border border-[#a43c2f] bg-[#f6e2dc] px-4 py-3 text-[14px] text-[#7d2e25]'>
      {message}
    </div>
  );
}
