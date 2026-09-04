import * as Contacts from 'expo-contacts/legacy';
import { BatchImportContact, normalizeToE164 } from '@shared/todo';
import { logError } from './clientLogger';

function formatPhoneLabel(rawLabel?: string, index: number = 0): string {
  if (!rawLabel) return `Phone ${index + 1}`;
  const clean = String(rawLabel).replace(/[_\$!<>]/g, '').trim();
  if (!clean) return `Phone ${index + 1}`;
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Requests device contacts permission if needed and returns formatted contacts from Android/iOS address book.
 * When a contact has multiple phone numbers, creates dedicated number-specific entries (e.g. "Ramesh (Mobile)", "Ramesh (Work)").
 */
export async function getDeviceContacts(shouldRequest: boolean = true): Promise<{
  granted: boolean;
  contacts: BatchImportContact[];
  error?: string;
}> {
  try {
    let permission = await Contacts.getPermissionsAsync();
    if (permission.status !== 'granted' && shouldRequest) {
      permission = await Contacts.requestPermissionsAsync();
    }

    if (permission.status !== 'granted') {
      return {
        granted: false,
        contacts: [],
        error: 'Permission to access device contacts was denied.',
      };
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.Image,
      ],
      sort: Contacts.SortTypes.FirstName,
    });

    if (!data || data.length === 0) {
      return { granted: true, contacts: [] };
    }

    const formatted: BatchImportContact[] = [];

    for (const item of data) {
      const baseName = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed Contact';
      const baseEmail = item.emails && item.emails.length > 0 ? item.emails[0].email || '' : '';
      const avatar = (item.imageAvailable && item.image && item.image.uri) ? item.image.uri : undefined;

      const phones = item.phoneNumbers || [];

      if (phones.length === 0) {
        if (baseName && baseName !== 'Unnamed Contact') {
          formatted.push({
            name: baseName,
            phone: '',
            email: baseEmail,
            avatar,
          });
        }
        continue;
      }

      if (phones.length === 1) {
        const rawPhone = phones[0].number || '';
        const phone = normalizeToE164(rawPhone) || rawPhone;
        formatted.push({
          name: baseName,
          phone,
          email: baseEmail,
          avatar,
        });
      } else {
        // Multiple phone numbers -> create an entry per phone number with label
        phones.forEach((p, idx) => {
          const rawPhone = p.number || '';
          const phone = normalizeToE164(rawPhone) || rawPhone;
          if (!phone) return;

          const label = formatPhoneLabel(p.label, idx);
          const entryName = `${baseName} (${label})`;

          formatted.push({
            name: entryName,
            phone,
            email: idx === 0 ? baseEmail : '',
            avatar,
          });
        });
      }
    }

    return {
      granted: true,
      contacts: formatted,
    };
  } catch (err: any) {
    logError({ event: 'device_contacts_read_failed', outcome: 'failure' }, err);
    return {
      granted: false,
      contacts: [],
      error: err?.message || 'Failed to read contacts.',
    };
  }
}

/**
 * Checks permissions, fetches device contacts, and imports/updates them into local SQLite.
 */
export async function syncDeviceContacts(
  batchImportFn: (contacts: BatchImportContact[]) => Promise<any>,
  promptPermission: boolean = true
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const result = await getDeviceContacts(promptPermission);
    if (!result.granted) {
      return { success: false, count: 0, error: result.error || 'Permission denied.' };
    }

    if (result.contacts.length === 0) {
      return { success: true, count: 0 };
    }

    const res = await batchImportFn(result.contacts);
    const count = (res?.importedCount || 0) + (res?.updatedCount || 0);
    return { success: true, count: count || result.contacts.length };
  } catch (err: any) {
    logError({ event: 'device_contacts_sync_failed', outcome: 'failure' }, err);
    return { success: false, count: 0, error: err?.message || 'Failed to sync contacts.' };
  }
}

/**
 * Automatically syncs device contacts on app open after a delay.
 */
export async function autoSyncDeviceContacts(
  batchImportFn: (contacts: BatchImportContact[]) => Promise<any>
): Promise<void> {
  try {
    await syncDeviceContacts(batchImportFn, true);
  } catch (err) {
    logError({ event: 'contact_auto_sync_failed', outcome: 'failure' }, err);
  }
}
