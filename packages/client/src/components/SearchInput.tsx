import { MagnifyingGlassIcon } from '@radix-ui/react-icons'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  isLoading: boolean
}

const PLACEHOLDER_OPTIONS = [
  "gets the shot away",
  "no disrespect to egg",
  "corridor of uncertainty",
  "football clubbing",
  "come what February"
]

// Do this outside of React component, so that we always get the same placeholder for each page load
const placeholderBase = PLACEHOLDER_OPTIONS[Math.floor(Math.random() * PLACEHOLDER_OPTIONS.length)]
const placeholder = `e.g. "${placeholderBase}"`

export default function SearchInput({ 
  value, 
  onChange, 
  isLoading,
}: SearchInputProps) {
  return (
    <div className="search-input-container mx-[-16px] pt-4 pb-8 px-[16px] sticky top-13 flex items-center bg-gradient-to-b from-white from-85% to-transparent z-10">
      <MagnifyingGlassIcon className="absolute left-6 top-1/2 transform -translate-y-4/5 h-7 w-6 text-gray-500" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input w-full p-3 pl-10 border-black border-2 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-none"
      />
      {isLoading && (
        <div className="search-spinner absolute right-6 top-1/2 transform -translate-y-4/5 border-t-transparent border-solid animate-spin rounded-full border-blue-500 border-4 h-7 w-7"></div>
      )}
    </div>
  )
} 