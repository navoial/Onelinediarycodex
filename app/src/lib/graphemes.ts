import GraphemeSplitter from 'grapheme-splitter'

const splitter = new GraphemeSplitter()
const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

type CountResult = {
  length: number
  graphemes: string[]
}

function segment(text: string): CountResult {
  if (segmenter) {
    const graphemes = Array.from(segmenter.segment(text), (segment) => segment.segment)
    return { length: graphemes.length, graphemes }
  }
  const graphemes = splitter.splitGraphemes(text)
  return { length: graphemes.length, graphemes }
}

export function countGraphemes(text: string) {
  return segment(text).length
}

export function truncateGraphemes(text: string, limit: number) {
  const { graphemes } = segment(text)
  if (graphemes.length <= limit) {
    return text
  }
  return graphemes.slice(0, limit).join('')
}
