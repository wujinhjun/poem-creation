import { useEffect, useRef } from 'react';

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
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = descriptionRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [description]);

  return (
    <div className='work-meta'>
      <span className='meta-rule'>题目</span>
      <input
        value={title}
        placeholder='无题'
        className='title-input'
        onChange={(event) => onTitleChange(event.currentTarget.value)}
      />
      <textarea
        ref={descriptionRef}
        value={description}
        placeholder='题记、说明或备注'
        className='description-input'
        rows={1}
        onChange={(event) => onDescriptionChange(event.currentTarget.value)}
      />
      <input
        value={author}
        placeholder='佚名'
        className='author-input'
        onChange={(event) => onAuthorChange(event.currentTarget.value)}
      />
    </div>
  );
}
