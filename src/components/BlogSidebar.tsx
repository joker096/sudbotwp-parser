import React from 'react';

export interface SearchFormProps {
  value: string;
  onChange?: ((q: string) => void) | undefined;
}

/**
 * SearchForm - компонент формы поиска постов блога.
 */
const _SearchComponent = ({ value, onChange }: SearchFormProps) => (
  <form onSubmit={(e)=>{ e.preventDefault(); }} className="mb-6">
    <label htmlFor="blog-search" className="block text-sm font-medium mb-1">Поиск</label>
    <input id="blog-search" type="text" placeholder="Найти пост..." value={value} onChange={(ev) => { if (onChange && ev?.target?.value !== undefined) { onChange(ev.target.value.trim()); } }}/>
  </form>);

export { _SearchComponent as SearchForm };


