/** No session-storage or editable metadata is an authorization source. */
export type OwnerIdentityClient = {
  auth: {getUser(): Promise<{data: {user: {id: string} | null}; error: unknown}>};
  rpc(name: 'takween_owner_authorized'): PromiseLike<{data: unknown; error: unknown}>;
};
export async function verifyOwner(client: OwnerIdentityClient): Promise<boolean> {
  try {
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user) return false;
    // RPC verifies JWT AAL2 and current enabled allowlist membership in Postgres.
    const authorization = await client.rpc('takween_owner_authorized');
    return !authorization.error && authorization.data === true;
  } catch { return false; }
}
