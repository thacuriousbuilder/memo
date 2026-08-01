

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
interface RawDocTab {
    tabProperties?: { tabId: string; title: string }
    documentTab?:   { body?: { content?: any[] } }
    childTabs?:     RawDocTab[]
  }
  
  export interface DocTab {
    tabId:     string
    title:     string
    text:      string
    childTabs: DocTab[]
  }
  
  export interface FlatDocTab {
    tabId: string
    title: string
    text:  string
    depth: number
  }
  
  // ─────────────────────────────────────────
  // TEXT EXTRACTION — walks the Docs API's
  // nested structural-element tree
  // ─────────────────────────────────────────
  function extractTextFromContent(content: any[]): string {
    let text = ''
    for (const el of content ?? []) {
      if (el.paragraph) {
        for (const pe of el.paragraph.elements ?? []) {
          if (pe.textRun?.content) text += pe.textRun.content
        }
      } else if (el.table) {
        for (const row of el.table.tableRows ?? []) {
          for (const cell of row.tableCells ?? []) {
            text += extractTextFromContent(cell.content)
          }
        }
      }
    }
    return text
  }
  
  function parseTab(tab: RawDocTab): DocTab {
    const body = tab.documentTab?.body?.content ?? []
    return {
      tabId:     tab.tabProperties?.tabId ?? '',
      title:     tab.tabProperties?.title ?? 'Untitled',
      text:      extractTextFromContent(body).trim(),
      childTabs: (tab.childTabs ?? []).map(parseTab),
    }
  }
  
  // ─────────────────────────────────────────
  // FETCH DOCUMENT TABS
  // ─────────────────────────────────────────
  export async function fetchDocTabs(
    documentId:  string,
    accessToken: string
  ): Promise<DocTab[]> {
    const res = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}?includeTabsContent=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) throw new Error('Failed to fetch document tabs.')
  
    const data = await res.json()
    const tabs: RawDocTab[] = data.tabs ?? []
    return tabs.map(parseTab)
  }
  
  // ─────────────────────────────────────────
  // FLATTEN — for a simple selection list,
  // preserving depth for indentation
  // ─────────────────────────────────────────
  export function flattenTabs(tabs: DocTab[], depth = 0): FlatDocTab[] {
    const flat: FlatDocTab[] = []
    for (const tab of tabs) {
      flat.push({ tabId: tab.tabId, title: tab.title, text: tab.text, depth })
      flat.push(...flattenTabs(tab.childTabs, depth + 1))
    }
    return flat
  }