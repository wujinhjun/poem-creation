type WorkMetadataFieldsProps = {
  title: string;
  description: string;
  author: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
};

export function WorkMetadataFields({
  title,
  description,
  author,
  onTitleChange,
  onDescriptionChange,
  onAuthorChange,
}: WorkMetadataFieldsProps) {
  return (
    <div className='mx-auto mb-8 grid max-w-[760px] gap-3 border-b border-[#8b6a4c]/20 pb-6 text-center'>
      <input
        value={title}
        placeholder='未题'
        className='w-full border-0 bg-transparent px-2 text-center font-serif text-[30px] font-bold leading-tight text-[#2d2118] outline-none placeholder:text-[#9a8066] focus:bg-[#fff9ea]/60'
        onChange={(event) => onTitleChange(event.currentTarget.value)}
      />
      <input
        value={description}
        placeholder='题记、说明或备注'
        className='w-full border-0 bg-transparent px-2 text-center text-[15px] leading-7 text-[#806851] outline-none placeholder:text-[#a78d73] focus:bg-[#fff9ea]/60'
        onChange={(event) => onDescriptionChange(event.currentTarget.value)}
      />
      <input
        value={author}
        placeholder='佚名'
        className='ml-auto w-[min(240px,100%)] border-0 bg-transparent px-2 text-right text-[16px] text-[#5e4735] outline-none placeholder:text-[#a78d73] focus:bg-[#fff9ea]/60'
        onChange={(event) => onAuthorChange(event.currentTarget.value)}
      />
    </div>
  );
}
