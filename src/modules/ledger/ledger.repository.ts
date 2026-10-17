import { and, asc, desc, eq } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { bills, credits } from '../../db/schema/entries.js';
import { contacts, customers, suppliers } from '../../db/schema/parties.js';

export type LedgerPartyRow = {
  id: number;
  name: string | null;
  email: string | null;
  gstNo: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  phone: string | null;
};

export const ledgerRepository = {
  async customer(id: number): Promise<LedgerPartyRow | null> {
    const [row] = await getDb()
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        gstNo: customers.gstNo,
        addressLine1: customers.addressLine1,
        addressLine2: customers.addressLine2,
      })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    if (!row) {
      return null;
    }
    const [phone] = await getDb()
      .select({ mobileNumber: contacts.mobileNumber })
      .from(contacts)
      .where(eq(contacts.customerId, id))
      .orderBy(desc(contacts.id))
      .limit(1);
    return { ...row, phone: phone?.mobileNumber ?? null };
  },

  async supplier(id: number): Promise<LedgerPartyRow | null> {
    const [row] = await getDb()
      .select({
        id: suppliers.id,
        name: suppliers.name,
        email: suppliers.email,
        gstNo: suppliers.gstNo,
        addressLine1: suppliers.addressLine1,
        addressLine2: suppliers.addressLine2,
      })
      .from(suppliers)
      .where(eq(suppliers.id, id))
      .limit(1);
    if (!row) {
      return null;
    }
    const [phone] = await getDb()
      .select({ mobileNumber: contacts.mobileNumber })
      .from(contacts)
      .where(eq(contacts.supplierId, id))
      .orderBy(desc(contacts.id))
      .limit(1);
    return { ...row, phone: phone?.mobileNumber ?? null };
  },

  async bills(supplierId: number, customerId: number) {
    return getDb()
      .select({
        date: bills.date,
        invoiceNo: bills.invoiceNo,
        amount: bills.billAmount,
        id: bills.id,
      })
      .from(bills)
      .where(and(eq(bills.supplierId, supplierId), eq(bills.customerId, customerId)))
      .orderBy(asc(bills.id));
  },

  async credits(supplierId: number, customerId: number) {
    return getDb()
      .select({
        date: credits.date,
        billNumber: credits.billNumber,
        paymentType: credits.paymentType,
        amount: credits.receivedAmount,
        id: credits.id,
      })
      .from(credits)
      .where(and(eq(credits.supplierId, supplierId), eq(credits.customerId, customerId)))
      .orderBy(asc(credits.id));
  },
};
