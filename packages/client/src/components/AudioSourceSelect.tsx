import { AudioSource, useAudioSource } from "../hooks/useAudioSource";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AudioSourceSelect() {
  const { audioSource, setAudioSource } = useAudioSource()

  const handleAudioSourceChange = (value: AudioSource) => {
    setAudioSource(value)
  }

  return (
    <div className="px-2">
      <Select value={audioSource} onValueChange={handleAudioSourceChange}>
        <SelectTrigger className="h-full">
          <SelectValue placeholder="Select an audio source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="transcribedFile">Transcribed File <em>(Default)</em></SelectItem>
          <SelectItem value="rssFeedURL">Latest RSS Feed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}