// Minimal, safe markdown renderer for chat replies: headings, bullet and
// numbered lists, bold, italic, inline code. Builds React elements only.

const renderInline = (text, keyPrefix) => {
  const parts = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|(?<![\w])_[^_\n]+_(?![\w])|\*[^*\s][^*]*\*)/g
  let last = 0
  let match
  let i = 0
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${i++}`
    if (token.startsWith('**')) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    else if (token.startsWith('`')) parts.push(<code key={key} className="px-1 rounded bg-fuchsia-100/70 text-fuchsia-800 text-[0.9em]">{token.slice(1, -1)}</code>)
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>)
    last = match.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

const Markdown = ({ text }) => {
  const blocks = []
  let list = null

  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag key={`l${blocks.length}`} className={`${list.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
        {list.items.map((item, i) => (
          <li key={i}>{renderInline(item, `li${blocks.length}-${i}`)}</li>
        ))}
      </Tag>,
    )
    list = null
  }

  text.split('\n').forEach((raw, index) => {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      if (list && list.ordered !== ordered) flush()
      if (!list) list = { ordered, items: [] }
      list.items.push((bullet || numbered)[1])
      return
    }
    flush()
    if (!line.trim()) return
    if (heading) {
      blocks.push(
        <p key={index} className="font-black text-gray-900">
          {renderInline(heading[2], `h${index}`)}
        </p>,
      )
    } else if (/^-{3,}$/.test(line.trim())) {
      blocks.push(<hr key={index} className="border-fuchsia-100" />)
    } else {
      blocks.push(<p key={index}>{renderInline(line, `p${index}`)}</p>)
    }
  })
  flush()

  return <div className="space-y-2 leading-relaxed">{blocks}</div>
}

export default Markdown
