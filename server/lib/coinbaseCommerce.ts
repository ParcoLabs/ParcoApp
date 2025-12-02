import coinbase from 'coinbase-commerce-node';

const Client = coinbase.Client;
const Charge = coinbase.resources.Charge;
const Webhook = coinbase.Webhook;

let initialized = false;

export function initializeCoinbaseCommerce() {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  
  if (!apiKey) {
    console.warn('COINBASE_COMMERCE_API_KEY not set - crypto payments disabled');
    return false;
  }
  
  if (!initialized) {
    Client.init(apiKey);
    initialized = true;
    console.log('Coinbase Commerce initialized');
  }
  
  return true;
}

export function isCommerceEnabled(): boolean {
  return !!process.env.COINBASE_COMMERCE_API_KEY;
}

export interface ChargeData {
  name: string;
  description: string;
  amount: string;
  currency?: string;
  metadata?: Record<string, string>;
}

export async function createCharge(data: ChargeData): Promise<any> {
  if (!initialized) {
    initializeCoinbaseCommerce();
  }
  
  const chargeData = {
    name: data.name,
    description: data.description,
    local_price: {
      amount: data.amount,
      currency: data.currency || 'USD',
    },
    pricing_type: 'fixed_price',
    metadata: data.metadata || {},
  };
  
  return new Promise((resolve, reject) => {
    Charge.create(chargeData, (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

export async function getCharge(chargeId: string): Promise<any> {
  if (!initialized) {
    initializeCoinbaseCommerce();
  }
  
  return new Promise((resolve, reject) => {
    Charge.retrieve(chargeId, (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

export async function listCharges(options: any = {}): Promise<any> {
  if (!initialized) {
    initializeCoinbaseCommerce();
  }
  
  return new Promise((resolve, reject) => {
    Charge.list(options, (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

export function verifyWebhook(rawBody: Buffer | string, signature: string): any {
  const sharedSecret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  
  if (!sharedSecret) {
    throw new Error('COINBASE_COMMERCE_WEBHOOK_SECRET not configured');
  }
  
  try {
    Webhook.verifySigHeader(rawBody, signature, sharedSecret);
    return JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString());
  } catch (error) {
    throw new Error('Webhook verification failed');
  }
}

export { Charge, Webhook };
