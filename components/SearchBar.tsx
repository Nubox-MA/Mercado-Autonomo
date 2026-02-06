'use client'

import { Search, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function SearchBar({ onSearch, placeholder = 'Buscar produtos...' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const onSearchRef = useRef(onSearch)

  // Atualizar a ref sempre que onSearch mudar
  useEffect(() => {
    onSearchRef.current = onSearch
  }, [onSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchRef.current(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        size={20}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-10 pr-10"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          aria-label="Limpar busca"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}

