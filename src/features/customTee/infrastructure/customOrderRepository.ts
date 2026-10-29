import { supabase } from '@/shared/infrastructure/supabase/client';
import { parseQuoteCheckout, type QuoteCheckout } from '../domain/customOrder';

export function previewPublicUrl(path: string): string {
  return supabase.storage.from('custom-previews').getPublicUrl(path).data.publicUrl;
}

export async function fetchQuoteForCheckout(token: string): Promise<QuoteCheckout | null> {
  const { data, error } = await supabase.rpc('get_quote_for_checkout', { p_token: token });
  if (error) throw new Error(error.message);
  return parseQuoteCheckout(data);
}

export async function placeCustomOrder(input: {
  token: string;
  orderId: string;
  userId: string;
  userEmail: string;
  name: string;
  phone: string;
  address: string;
  deliveryFee: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc('place_custom_order', {
    p_token: input.token,
    p_order_id: input.orderId,
    p_user_id: input.userId,
    p_user_email: input.userEmail,
    p_name: input.name,
    p_phone: input.phone,
    p_address: input.address,
    p_delivery_fee: input.deliveryFee,
  });
  if (error) throw new Error(error.message);
  return typeof data === 'string' && data ? data : input.orderId;
}
