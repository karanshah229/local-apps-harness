import * as Contacts from 'expo-contacts';
import { BatchImportContact, normalizeToE164 } from '@shared/todo';

let memoryLastSyncDate: string | null = null;

/**
 * Requests device contacts permission and returns formatted contacts from Android or iOS address book.
 */
export async function getDeviceContacts(): Promise<{
  granted: boolean;
  contacts: BatchImportContact[];
  error?: string;
}> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      return {
        granted: false,
        contacts: [],
        error: 'Permission to access device contacts was denied.'
      };
    }

    const data = await Contacts.Contact.getAllDetails(
      [
        Contacts.ContactField.FULL_NAME,
        Contacts.ContactField.GIVEN_NAME,
        Contacts.ContactField.FAMILY_NAME,
        Contacts.ContactField.PHONES,
        Contacts.ContactField.EMAILS,
        Contacts.ContactField.IMAGE
      ],
      { sortOrder: Contacts.ContactsSortOrder.GivenName }
    );

    if (!data || data.length === 0) {
      return { granted: true, contacts: [] };
    }

    const formatted: BatchImportContact[] = [];

    for (const item of data) {
      const name = item.fullName || `${item.givenName || ''} ${item.familyName || ''}`.trim() || 'Unnamed Contact';
      const rawPhone = item.phones && item.phones.length > 0 ? item.phones[0].number || '' : '';
      const phone = normalizeToE164(rawPhone) || rawPhone;
      const email = item.emails && item.emails.length > 0 ? item.emails[0].address || '' : '';
      const avatar = item.image || undefined;

      if (!name && !phone && !email) continue;

      formatted.push({
        name,
        phone,
        email,
        avatar
      });
    }

    return {
      granted: true,
      contacts: formatted
    };
  } catch (err: any) {
    console.error('Error reading native device contacts:', err);
    return {
      granted: false,
      contacts: [],
      error: err?.message || 'Failed to read contacts.'
    };
  }
}

/**
 * Automatically syncs device contacts if today is a new day and the app was opened for the first time.
 */
export async function autoSyncDeviceContacts(
  batchImportFn: (contacts: BatchImportContact[]) => Promise<any>
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  if (memoryLastSyncDate === today) {
    return;
  }

  try {
    const { status } = await Contacts.getPermissionsAsync();
    // Only attempt silent auto-sync if permission is granted
    if (status === 'granted') {
      const result = await getDeviceContacts();
      if (result.granted && result.contacts.length > 0) {
        await batchImportFn(result.contacts);
        memoryLastSyncDate = today;
      }
    }
  } catch (err) {
    console.warn('Auto contact sync skipped or failed:', err);
  }
}
