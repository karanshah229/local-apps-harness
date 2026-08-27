import * as Contacts from 'expo-contacts';
import { BatchImportContact } from '@saileshbhai/todo-shared';

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

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.Image
      ],
      sort: Contacts.SortTypes.FirstName
    });

    if (!data || data.length === 0) {
      return { granted: true, contacts: [] };
    }

    const formatted: BatchImportContact[] = [];

    for (const item of data) {
      const name = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed Contact';
      const phone = item.phoneNumbers && item.phoneNumbers.length > 0 ? item.phoneNumbers[0].number || '' : '';
      const email = item.emails && item.emails.length > 0 ? item.emails[0].email || '' : '';
      const avatar = item.imageAvailable && item.image ? item.image.uri : undefined;

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
