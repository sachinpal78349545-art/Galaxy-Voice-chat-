// agencyService.ts – Host & Agency application system
import { ref, push, get, update, set, onValue, off } from "firebase/database";
import { db } from "./firebase";

export interface HostApplication {
  id: string;
  uid: string;
  userId: string;
  name: string;
  avatar: string;
  reason: string;
  experience: string;
  socialLinks?: string;
  languages?: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface AgencyApplication {
  id: string;
  uid: string;
  userId: string;
  name: string;
  avatar: string;
  agencyName: string;
  description: string;
  hostCount: string;
  website?: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface AgencyInfo {
  id: string;
  ownerUid: string;
  ownerName: string;
  ownerAvatar: string;
  agencyName: string;
  description: string;
  memberCount: number;
  createdAt: number;
  verified: boolean;
}

// ─── Host Applications ───────────────────────────────────────────────────────

export async function applyForHost(
  uid: string,
  data: Pick<HostApplication, "userId" | "name" | "avatar" | "reason" | "experience" | "socialLinks" | "languages">
): Promise<string> {
  // Check if already applied
  const existing = await getUserHostApplication(uid);
  if (existing && existing.status === "pending") {
    throw new Error("You already have a pending host application.");
  }

  const appsRef = ref(db, "hostApplications");
  const newRef = push(appsRef);
  const id = newRef.key!;
  await set(newRef, { ...data, uid, id, status: "pending", appliedAt: Date.now() });

  // Notify super admin
  try {
    const notifRef = ref(db, `notifications/super_admin_306623582/${id}`);
    await set(notifRef, {
      type: "host_application",
      title: "New Host Application",
      body: `${data.name} (ID: ${data.userId}) has applied to become a host.`,
      uid,
      applicationId: id,
      read: false,
      timestamp: Date.now(),
    });
  } catch { /* non-critical */ }

  return id;
}

export async function getUserHostApplication(uid: string): Promise<HostApplication | null> {
  const snap = await get(ref(db, "hostApplications"));
  if (!snap.exists()) return null;
  const all = Object.values(snap.val()) as HostApplication[];
  return all.find(a => a.uid === uid) || null;
}

export async function getHostApplications(): Promise<HostApplication[]> {
  const snap = await get(ref(db, "hostApplications"));
  if (!snap.exists()) return [];
  return (Object.values(snap.val()) as HostApplication[]).sort((a, b) => b.appliedAt - a.appliedAt);
}

export function subscribeHostApplications(cb: (apps: HostApplication[]) => void): () => void {
  const r = ref(db, "hostApplications");
  const handler = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    cb((Object.values(snap.val()) as HostApplication[]).sort((a, b) => b.appliedAt - a.appliedAt));
  });
  return () => off(r, "value", handler);
}

export async function reviewHostApplication(
  id: string,
  status: "approved" | "rejected",
  note: string,
  reviewerUid: string
): Promise<void> {
  await update(ref(db, `hostApplications/${id}`), {
    status, reviewNote: note, reviewedAt: Date.now(), reviewedBy: reviewerUid,
  });
}

// ─── Agency Applications ─────────────────────────────────────────────────────

export async function applyForAgency(
  uid: string,
  data: Pick<AgencyApplication, "userId" | "name" | "avatar" | "agencyName" | "description" | "hostCount" | "website">
): Promise<string> {
  const existing = await getUserAgencyApplication(uid);
  if (existing && existing.status === "pending") {
    throw new Error("You already have a pending agency application.");
  }

  const appsRef = ref(db, "agencyApplications");
  const newRef = push(appsRef);
  const id = newRef.key!;
  await set(newRef, { ...data, uid, id, status: "pending", appliedAt: Date.now() });

  try {
    const notifRef = ref(db, `notifications/super_admin_306623582/${id}_agency`);
    await set(notifRef, {
      type: "agency_application",
      title: "New Agency Application",
      body: `${data.name} applied to create agency "${data.agencyName}".`,
      uid,
      applicationId: id,
      read: false,
      timestamp: Date.now(),
    });
  } catch { /* non-critical */ }

  return id;
}

export async function getUserAgencyApplication(uid: string): Promise<AgencyApplication | null> {
  const snap = await get(ref(db, "agencyApplications"));
  if (!snap.exists()) return null;
  const all = Object.values(snap.val()) as AgencyApplication[];
  return all.find(a => a.uid === uid) || null;
}

export async function getAgencyApplications(): Promise<AgencyApplication[]> {
  const snap = await get(ref(db, "agencyApplications"));
  if (!snap.exists()) return [];
  return (Object.values(snap.val()) as AgencyApplication[]).sort((a, b) => b.appliedAt - a.appliedAt);
}

export function subscribeAgencyApplications(cb: (apps: AgencyApplication[]) => void): () => void {
  const r = ref(db, "agencyApplications");
  const handler = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    cb((Object.values(snap.val()) as AgencyApplication[]).sort((a, b) => b.appliedAt - a.appliedAt));
  });
  return () => off(r, "value", handler);
}

export async function reviewAgencyApplication(
  id: string,
  status: "approved" | "rejected",
  note: string,
  reviewerUid: string
): Promise<void> {
  await update(ref(db, `agencyApplications/${id}`), {
    status, reviewNote: note, reviewedAt: Date.now(), reviewedBy: reviewerUid,
  });
}

// ─── Agency Directory ─────────────────────────────────────────────────────────

export function subscribeAgencies(cb: (agencies: AgencyInfo[]) => void): () => void {
  const r = ref(db, "agencies");
  const handler = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    cb((Object.values(snap.val()) as AgencyInfo[]).sort((a, b) => b.memberCount - a.memberCount));
  });
  return () => off(r, "value", handler);
}

export async function createAgency(ownerUid: string, info: Omit<AgencyInfo, "id" | "memberCount" | "createdAt" | "verified">): Promise<string> {
  const agRef = ref(db, "agencies");
  const newRef = push(agRef);
  const id = newRef.key!;
  await set(newRef, { ...info, id, ownerUid, memberCount: 1, createdAt: Date.now(), verified: false });
  // Record on user profile
  await update(ref(db, `users/${ownerUid}`), { agencyId: id, agencyRole: "owner" });
  return id;
}
