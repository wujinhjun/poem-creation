export function AppNotice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className='app-notice'>
      {message}
    </div>
  );
}
