import { relatedProjects, type VercelRelatedProject } from '@vercel/related-projects';

const normaliseHost = (value: string): string => {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
};

const safeRelatedProjects = (): VercelRelatedProject[] => {
  try {
    return relatedProjects({ noThrow: true });
  } catch (error) {
    // If the environment variable is missing or unparsable we silently ignore it.
    return [];
  }
};

const resolveHostFromRelatedProject = (project: VercelRelatedProject, vercelEnv: string | undefined): string | undefined => {
  if (vercelEnv === 'preview' && project.preview.branch) {
    return normaliseHost(project.preview.branch);
  }

  if (vercelEnv === 'production') {
    if (project.production.alias) {
      return normaliseHost(project.production.alias);
    }

    if (project.production.url) {
      return normaliseHost(project.production.url);
    }
  }

  return undefined;
};

const appendPath = (host: string, path: string | undefined): string => {
  if (!path || path === '/') {
    return host.endsWith('/') ? host : `${host}/`;
  }

  const url = new URL(path.startsWith('/') ? path : `/${path}`, host);
  return url.toString();
};

export type RelatedProjectResolutionInput = {
  projectName?: string;
  defaultHost?: string;
  path?: string;
};

export type RelatedProjectResolution = {
  host?: string;
  source: 'explicit' | 'related-project' | 'default' | 'none';
};

export const resolveRelatedProjectHost = ({
  projectName,
  defaultHost,
  path
}: RelatedProjectResolutionInput): RelatedProjectResolution => {
  const fallbackHost = defaultHost ? normaliseHost(defaultHost) : undefined;

  if (!projectName) {
    if (fallbackHost) {
      return { host: appendPath(fallbackHost, path), source: 'default' };
    }

    return { source: 'none' };
  }

  const projects = safeRelatedProjects();
  const vercelEnv = process.env.VERCEL_ENV;
  const match = projects.find((project) => project.project.name === projectName || project.project.id === projectName);

  if (match) {
    const host = resolveHostFromRelatedProject(match, vercelEnv);
    if (host) {
      return { host: appendPath(host, path), source: 'related-project' };
    }
  }

  if (fallbackHost) {
    return { host: appendPath(fallbackHost, path), source: 'default' };
  }

  return { source: 'none' };
};

export const resolveTaskUrl = ({
  explicitUrl,
  projectName,
  defaultHost,
  path
}: {
  explicitUrl?: string;
  projectName?: string;
  defaultHost?: string;
  path?: string;
}): { url: string; source: RelatedProjectResolution['source'] } => {
  if (explicitUrl) {
    return { url: explicitUrl, source: 'explicit' };
  }

  const resolution = resolveRelatedProjectHost({ projectName, defaultHost, path });
  if (resolution.host) {
    return { url: resolution.host, source: resolution.source };
  }

  const fallback = 'https://example.com/';
  return { url: fallback, source: 'none' };
};

