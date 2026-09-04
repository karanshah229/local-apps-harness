import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  UserPlus,
  RefreshCw,
  X,
} from 'lucide-react-native';
import { useUiStore } from '../../src/store/useUiStore';
import {
  useUsersQuery,
  useAddUserMutation,
  useBatchImportUsersMutation,
} from '../../src/hooks/useTodoQueries';
import { syncDeviceContacts } from '../../src/services/nativeContacts';
import { User, normalizeToE164, fuzzyMatch, getMultiFieldSearchScore } from '@shared/todo';
import { logError } from '../../src/services/clientLogger';

const ITEM_HEIGHT = 72;

interface ContactItemProps {
  user: User;
  isDarkMode: boolean;
}

const ContactItem = React.memo(({ user, isDarkMode }: ContactItemProps) => {
  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : '??';

  return (
    <View
      style={{
        height: 64,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        borderRadius: 18,
        backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
        borderWidth: 1,
        borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
        gap: 12,
      }}
    >
      {user.avatar ? (
        <Image
          source={{ uri: user.avatar }}
          style={{ width: 38, height: 38, borderRadius: 19 }}
        />
      ) : (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(0,120,212,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#0078d4', fontWeight: '800', fontSize: 13 }}>
            {initials}
          </Text>
        </View>
      )}

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: isDarkMode ? '#ffffff' : '#0f172a',
          }}
          numberOfLines={1}
        >
          {user.name}
        </Text>
        {user.phone ? (
          <Text
            style={{
              fontSize: 12,
              color: isDarkMode ? '#a1a1aa' : '#64748b',
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {user.phone}
          </Text>
        ) : (
          <Text
            style={{
              fontSize: 12,
              color: isDarkMode ? '#52525b' : '#94a3b8',
              marginTop: 2,
            }}
          >
            No phone number
          </Text>
        )}
      </View>
    </View>
  );
});

export default function ContactsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isDarkMode, showAlertDialog } = useUiStore();
  const { data: users = [] } = useUsersQuery();
  const addUserMutation = useAddUserMutation();
  const batchImportMutation = useBatchImportUsersMutation();

  const handleRefreshContacts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await syncDeviceContacts(async (contacts) => {
        await batchImportMutation.mutateAsync(contacts);
      }, true);
      if (res.success) {
        showAlertDialog('Contacts Synced', 'Successfully refreshed and synced contacts.');
      } else if (res.error) {
        showAlertDialog('Sync Contacts', res.error);
      }
    } catch (error) {
      logError({ event: 'contacts_refresh_failed', outcome: 'failure' }, error);
      showAlertDialog('Error', 'Failed to refresh contacts.');
    } finally {
      setIsRefreshing(false);
    }
  }, [batchImportMutation, showAlertDialog]);

  const handleAddUser = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await addUserMutation.mutateAsync({
        name: newName.trim(),
        phone: normalizeToE164(newPhone.trim()) || newPhone.trim(),
      });
      setNewName('');
      setNewPhone('');
      setShowAddUser(false);
    } catch (error) {
      logError({ event: 'contact_create_failed', outcome: 'failure' }, error);
      showAlertDialog('Error', 'Failed to add contact.');
    }
  }, [newName, newPhone, addUserMutation, showAlertDialog]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return users;
    return users
      .filter(
        (u) =>
          fuzzyMatch(u.name || '', q) ||
          fuzzyMatch(u.phone || '', q) ||
          fuzzyMatch(u.email || '', q)
      )
      .sort((a, b) => {
        const scoreA = getMultiFieldSearchScore([a.name, a.phone, a.email], q);
        const scoreB = getMultiFieldSearchScore([b.name, b.phone, b.email], q);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return 0;
      });
  }, [users, searchQuery]);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const keyExtractor = useCallback((item: User) => String(item.id), []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: User }) => <ContactItem user={item} isDarkMode={isDarkMode} />,
    [isDarkMode]
  );

  const ListHeader = useMemo(() => {
    if (!showAddUser) return null;
    return (
      <View
        style={{
          backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
          padding: 16,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
          marginBottom: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
            New Contact
          </Text>
          <TouchableOpacity onPress={() => setShowAddUser(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="Full Name *"
          placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
          value={newName}
          onChangeText={setNewName}
          style={{
            backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#3f3f46' : '#cbd5e1',
            color: isDarkMode ? '#ffffff' : '#0f172a',
            fontSize: 13,
          }}
        />

        <TextInput
          placeholder="Phone Number (e.g. +91 98765 43210)"
          placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
          value={newPhone}
          onChangeText={setNewPhone}
          keyboardType="phone-pad"
          style={{
            backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#3f3f46' : '#cbd5e1',
            color: isDarkMode ? '#ffffff' : '#0f172a',
            fontSize: 13,
          }}
        />

        <TouchableOpacity
          onPress={handleAddUser}
          disabled={!newName.trim()}
          style={{
            backgroundColor: '#0078d4',
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 4,
            opacity: newName.trim() ? 1 : 0.5,
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Save Contact</Text>
        </TouchableOpacity>
      </View>
    );
  }, [showAddUser, isDarkMode, newName, newPhone, handleAddUser]);

  const ListEmpty = useMemo(
    () => (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: isDarkMode ? '#71717a' : '#94a3b8' }}>
          No contacts match your search
        </Text>
      </View>
    ),
    [isDarkMode]
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#09090b' : '#f8fafc', paddingTop: topInset }}>
      {/* Header Bar - Consistent with Task Detail Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#27272a' : '#f1f5f9',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            <ArrowLeft size={20} color={isDarkMode ? '#ffffff' : '#0f172a'} />
          </TouchableOpacity>

          <View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: isDarkMode ? '#ffffff' : '#0f172a' }}>
              Contacts
            </Text>
            <Text style={{ fontSize: 12, color: isDarkMode ? '#a1a1aa' : '#64748b', marginTop: 1 }}>
              {users.length} contacts
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Refresh Button on left of Add Contact button */}
          <TouchableOpacity
            onPress={handleRefreshContacts}
            disabled={isRefreshing}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
            accessibilityLabel="Refresh and sync contacts"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#0078d4" />
            ) : (
              <RefreshCw size={18} color={isDarkMode ? '#ffffff' : '#0f172a'} />
            )}
          </TouchableOpacity>

          {/* Add Contact Button */}
          <TouchableOpacity
            onPress={() => setShowAddUser(!showAddUser)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#0078d4',
              paddingHorizontal: 14,
              height: 44,
              borderRadius: 22,
            }}
          >
            <UserPlus size={16} color="#ffffff" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>Add Contact</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <Search size={16} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search contacts by name or phone..."
            placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: '600',
              color: isDarkMode ? '#ffffff' : '#0f172a',
              paddingVertical: 2,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={isDarkMode ? '#71717a' : '#94a3b8'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Virtualized & Optimized FlatList */}
      <FlatList
        data={filteredUsers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom + 20, 36) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
