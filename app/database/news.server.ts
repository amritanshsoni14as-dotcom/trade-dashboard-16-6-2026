/**
 * Google News RSS adapter.
 *
 * Pulls a per-symbol news feed. Free, no API key, no auth. Captures most
 * bulk-deal / block-deal / promoter coverage because mainstream sources
 * (ET, Mint, Moneycontrol, BS) report these and are indexed by Google News.
 *
 * Returns [] on any parse / network failure so callers degrade cleanly.
 */

export type NewsItem = {
    symbol: string;
    title: string;
    link: string;
    publishedAt: Date | null;
    source: string | null;
    description: string | null;
};

const FEED_URL = "https://news.google.com/rss/search";

function buildQuery(symbol: string, companyName?: string | null): string {
    // Symbol alone gets noise (e.g. "ITC" -> tobacco news, hotel news).
    // Pair with a stock keyword so most hits are market-related.
    const base = companyName
        ? `"${companyName}" OR ${symbol}`
        : `${symbol}`;
    return `${base} stock OR shares OR NSE OR BSE`;
}

function extractTag(xml: string, tag: string): string | null {
    const open = `<${tag}>`;
    const close = `</${tag}>`;
    const start = xml.indexOf(open);
    if (start === -1) return null;
    const end = xml.indexOf(close, start);
    if (end === -1) return null;
    return xml.slice(start + open.length, end);
}

function stripCData(s: string | null): string | null {
    if (!s) return s;
    const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    return m ? m[1]! : s;
}

function stripHtml(s: string | null): string | null {
    if (!s) return s;
    return s
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
}

function parseRss(xml: string, symbol: string): NewsItem[] {
    const items: NewsItem[] = [
    ];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1]!;
        const titleRaw = stripCData(extractTag(block, "title"));
        const linkRaw = extractTag(block, "link");
        const pubRaw = extractTag(block, "pubDate");
        const sourceRaw = stripCData(extractTag(block, "source"));
        const descRaw = stripCData(extractTag(block, "description"));

        if (!titleRaw || !linkRaw) continue;

        const publishedAt = pubRaw ? new Date(pubRaw) : null;

        items.push({
            symbol,
            title: stripHtml(titleRaw) ?? "",
            link: linkRaw.trim(),
            publishedAt:
                publishedAt && !Number.isNaN(publishedAt.getTime())
                    ? publishedAt
                    : null,
            source: stripHtml(sourceRaw),
            description: stripHtml(descRaw)
        });
    }

    return items;
}

export async function fetchSymbolNews(
    symbol: string,
    companyName?: string | null,
    limit = 12
): Promise<NewsItem[]> {
    const query = buildQuery(symbol, companyName);
    const url = `${FEED_URL}?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

    try {
        const res = await fetch(url, {
            headers: {
                Accept: "application/rss+xml,application/xml" 
            }
            // next: { revalidate: 900 } // 15 min
        });
        if (!res.ok) return [
        ];
        const xml = await res.text();
        return parseRss(xml, symbol).slice(0, limit);
    } catch {
        return [
        ];
    }
}

export async function fetchNewsForSymbols(
    pairs: Array<{
        symbol: string;
        companyName?: string | null 
    }>,
    perSymbol = 6
): Promise<NewsItem[]> {
    const results = await Promise.all(pairs.map((p) => fetchSymbolNews(p.symbol, p.companyName, perSymbol)));

    // Flatten + dedup by link, sort by recency.
    const seen = new Set<string>();
    const merged: NewsItem[] = [
    ];
    for (const list of results) {
        for (const item of list) {
            if (seen.has(item.link)) continue;
            seen.add(item.link);
            merged.push(item);
        }
    }

    merged.sort((a, b) => {
        const at = a.publishedAt?.getTime() ?? 0;
        const bt = b.publishedAt?.getTime() ?? 0;
        return bt - at;
    });

    return merged;
}
