'use client'

import { Search } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function SearchBar({ onSearch, placeholder = 'Buscar produtos...' }: SearchBarProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onSearch])

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
        className="input-field pl-10"
      />
    </div>
  )
}

