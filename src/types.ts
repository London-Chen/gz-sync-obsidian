export interface StyleProfile {
  body: {
    fontSize: string;
    color: string;
    letterSpacing: string;
    lineHeight: string;
    paragraphMarginBottom: string;
    sidePadding: string;
    textAlign: string;
  };
  headings: {
    h1: string;
    h2: string;
    h3: string;
  };
  note: {
    fontSize: string;
    color: string;
  };
  colors: {
    accent: string;
    muted: string;
    border: string;
    background: string;
  };
}

export interface ImageRef {
  alt: string;
  raw: string;
  resolved?: string;
  isRemote: boolean;
  exists: boolean;
}

export interface ArticleMeta {
  title: string;
  author: string;
  digest: string;
  cover?: string;
  sourceUrl?: string;
  slug: string;
}

export interface ParsedArticle {
  filePath: string;
  vaultRoot: string;
  meta: ArticleMeta;
  markdown: string;
  images: ImageRef[];
  cover?: ImageRef;
  readiness: string[];
}

export interface RenderedArticle {
  contentHtml: string;
  previewHtml: string;
  imageMap: Map<string, string>;
}

export interface AppConfig {
  appid?: string;
  secret?: string;
  author: string;
  defaultCover?: string;
}

export interface DraftResult {
  mediaId?: string;
  title: string;
  thumbMediaId: string;
  uploadedImages: number;
  previewPath: string;
  outputPath: string;
  raw: unknown;
}
