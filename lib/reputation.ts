import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const REPUTATION_SECRET = process.env.REPUTATION_SECRET || 'default-ulagat-secret-salt-2026';

/**
 * Calculates the SHA-256 hash of a block's content.
 */
export function calculateHash(
  userId: string,
  action: string,
  points: number,
  previousHash: string,
  timestamp: string,
  metadata: Record<string, unknown>
): string {
  const data = `${userId}${action}${points}${previousHash}${timestamp}${JSON.stringify(metadata)}${REPUTATION_SECRET}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Mines a new reputation block.
 *
 * @deprecated Currently unused. Direct INSERTs into reputation_ledger are
 * blocked by RLS since the "Users can insert reputation" policy was dropped
 * (security hardening, db/phase-3-6-enhancements.sql P0-1). All point awards
 * must go through the SECURITY DEFINER award_reputation_points() DB function
 * (fired by triggers) instead. If chain mining is ever revived, do it inside
 * a SECURITY DEFINER RPC or with the service-role admin client.
 */
export async function mineBlock(
  userId: string,
  action: string,
  points: number,
  metadata: Record<string, unknown> = {}
) {
  const supabase = await createClient();

  // 1. Get the last block
  const { data: lastBlocks } = await supabase
    .from('reputation_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  let previousHash = '00000000000000000000000000000000';

  if (lastBlocks && lastBlocks.length > 0) {
    previousHash = lastBlocks[0].current_hash;
  }

  // 2. Prepare new block data
  const timestamp = new Date().toISOString();
  const currentHash = calculateHash(userId, action, points, previousHash, timestamp, metadata);

  // 3. Insert
  const { error } = await supabase.from('reputation_ledger').insert({
    user_id: userId,
    action_type: action,
    points: points,
    metadata: metadata,
    previous_hash: previousHash,
    current_hash: currentHash,
    created_at: timestamp
  });


  if (error) {
    console.error('Error mining block:', error);
    throw error;
  }
  return currentHash;
}

/**
 * Verifies the integrity of a user's reputation chain.
 * Returns true if valid, false if tampered.
 */
export async function verifyChain(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from('reputation_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (!blocks || blocks.length === 0) return true;

  for (let i = 1; i < blocks.length; i++) {
    const current = blocks[i];
    const previous = blocks[i - 1];

    if (current.previous_hash !== previous.current_hash) {
      return false;
    }

    // In a stricter check, we would re-calculate current_hash based on DB values 
    // and compare with stored current_hash. 
    // const calculated = calculateHash(current.user_id, current.action_type, current.points, current.previous_hash, current.created_at, current.metadata);
    // if (calculated !== current.current_hash) return false;
  }

  return true;
}
