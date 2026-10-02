import crypto from "node:crypto";
import { aiProviders } from "../../config/aiProviders.js";
import { MediaError, networkError } from "../errors.js";
import { saveMedia } from "../store.js";
import type { VideoOptions, VideoProvider } from "./types.js";
import { createVeoProvider } from "./veo.js";

let instance: VideoProvider | null | undefined;

export function getVideoProvider(): VideoProvider | null {
  if (instance !== undefined) return instance;
  const { provider, apiKey, model } = aiProviders.video;
  instance = provider === "veo" && apiKey ? createVeoProvider(apiKey, model) : null;
  return instance;
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface PublicJob {
  id: string;
  status: JobStatus;
  progress: number | null;
  createdAt: number;
  result?: { url: string; mime: string; size: number };
  error?: { code: string; message: string };
}

interface Job extends PublicJob {
  providerJobId: string;
  lastPoll: number;
  polling?: Promise<void>;
}

/**
 * In-memory job registry mapping our job ids to provider operations.
 * Provider ids never leave the server. Jobs are kept for 24h.
 */
const jobs = new Map<string, Job>();
const JOB_TTL = 24 * 3_600_000;
const MAX_JOB_AGE_RUNNING = 20 * 60_000;

export async function startJob(prompt: string, options: VideoOptions): Promise<PublicJob> {
  const provider = getVideoProvider();
  if (!provider) throw new MediaError("missing_api_key", "Video generation is not configured on the server.", 503);
  for (const [k, j] of jobs) if (Date.now() - j.createdAt > JOB_TTL) jobs.delete(k);
  let providerJobId: string;
  try {
    providerJobId = await provider.start(prompt, options);
  } catch (e) {
    throw networkError(e, "Video");
  }
  const job: Job = { id: crypto.randomUUID(), status: "running", progress: null, createdAt: Date.now(), providerJobId, lastPoll: 0 };
  jobs.set(job.id, job);
  return toPublic(job);
}

export async function getJob(id: string): Promise<PublicJob | null> {
  const job = jobs.get(id);
  if (!job) return null;
  if (job.status === "running" && Date.now() - job.lastPoll > 4000) {
    job.polling ??= refresh(job).finally(() => (job.polling = undefined));
    await job.polling;
  }
  return toPublic(job);
}

async function refresh(job: Job) {
  const provider = getVideoProvider();
  if (!provider) return;
  job.lastPoll = Date.now();
  try {
    const s = await provider.poll(job.providerJobId);
    if (s.state === "running") {
      job.progress = provider.capabilities.progress && typeof s.progress === "number" ? s.progress : null;
      if (Date.now() - job.createdAt > MAX_JOB_AGE_RUNNING) {
        job.status = "failed";
        job.error = { code: "timeout", message: "Video generation took too long. Please try again." };
      }
    } else if (s.state === "succeeded") {
      const saved = await saveMedia(s.video.data, s.video.mime);
      job.status = "succeeded";
      job.progress = null;
      job.result = { url: saved.url, mime: saved.mime, size: saved.size };
    } else {
      job.status = "failed";
      job.error = { code: s.code, message: s.message };
    }
  } catch (e) {
    const err = networkError(e, "Video");
    // Transient network issues: keep polling; hard errors fail the job.
    if (err.code !== "network_error" && err.code !== "timeout" && err.code !== "provider_unavailable") {
      job.status = "failed";
      job.error = { code: err.code, message: err.message };
    }
  }
}

const toPublic = ({ id, status, progress, createdAt, result, error }: Job): PublicJob => ({ id, status, progress, createdAt, result, error });
