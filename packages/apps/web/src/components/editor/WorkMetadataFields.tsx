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
    <div className='work-meta'>
      <span className='meta-rule'>题目</span>
      <input
        value={title}
        placeholder='未题'
        className='title-input'
        onChange={(event) => onTitleChange(event.currentTarget.value)}
      />
      <input
        value={description}
        placeholder='题记、说明或备注'
        className='description-input'
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
