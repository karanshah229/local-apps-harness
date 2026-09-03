import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { Check, ListTodo, Search, X } from 'lucide-react-native';
import { List, fuzzyMatch, getSearchMatchScore, getThemePrimary } from '@shared/todo';

interface BulkListPickerModalProps {
  visible: boolean;
  selectedCount: number;
  lists: List[];
  isDarkMode: boolean;
  themePrimary: string;
  onClose: () => void;
  onAddToLists: (listIds: number[]) => void;
}

export function BulkListPickerModal({
  visible,
  selectedCount,
  lists,
  isDarkMode,
  themePrimary,
  onClose,
  onAddToLists,
}: BulkListPickerModalProps) {
  const [query, setQuery] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const textColor = isDarkMode ? '#f4f4f5' : '#0f172a';
  const mutedColor = isDarkMode ? '#a1a1aa' : '#64748b';
  const surfaceColor = isDarkMode ? '#18181b' : '#ffffff';
  const inputColor = isDarkMode ? '#27272a' : '#f1f5f9';

  const filteredLists = useMemo(() => {
    const q = query.trim();
    if (!q) return lists;
    return lists
      .filter((list) => fuzzyMatch(list.title, q))
      .sort((a, b) => getSearchMatchScore(b.title, q) - getSearchMatchScore(a.title, q));
  }, [lists, query]);

  const toggleList = (id: number) => {
    setSelectedListIds((current) => current.includes(id)
      ? current.filter((listId) => listId !== id)
      : [...current, id]);
  };

  const close = () => {
    setQuery('');
    setSelectedListIds([]);
    onClose();
  };

  const apply = () => {
    if (selectedListIds.length === 0) return;
    onAddToLists(selectedListIds);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <TouchableWithoutFeedback onPress={(event) => event.stopPropagation()}>
            <View style={{ backgroundColor: surfaceColor, borderRadius: 24, padding: 20, maxHeight: '82%', borderWidth: 1, borderColor: isDarkMode ? '#27272a' : '#e2e8f0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: textColor, fontSize: 20, fontWeight: '800' }}>Add to list</Text>
                  <Text style={{ color: mutedColor, fontSize: 13, fontWeight: '600', marginTop: 3 }}>
                    Add lists to {selectedCount} selected {selectedCount === 1 ? 'task' : 'tasks'}
                  </Text>
                </View>
                <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: inputColor, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color={mutedColor} />
                </TouchableOpacity>
              </View>

              <View style={{ height: 48, borderRadius: 14, backgroundColor: inputColor, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginTop: 16, marginBottom: 12 }}>
                <Search size={18} color={mutedColor} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search lists..."
                  placeholderTextColor={mutedColor}
                  style={{ flex: 1, marginLeft: 10, color: textColor, fontSize: 15, fontWeight: '600' }}
                />
              </View>

              <FlatList
                data={filteredLists}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 320 }}
                ListEmptyComponent={<Text style={{ color: mutedColor, textAlign: 'center', paddingVertical: 22 }}>No lists found.</Text>}
                renderItem={({ item }) => {
                  const selected = selectedListIds.includes(item.id);
                  return (
                    <TouchableOpacity onPress={() => toggleList(item.id)} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: selected ? themePrimary : (isDarkMode ? '#52525b' : '#94a3b8'), backgroundColor: selected ? themePrimary : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        {selected && <Check size={15} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <ListTodo size={18} color={getThemePrimary(item.color_theme || 'blue', isDarkMode)} />
                      <Text style={{ flex: 1, marginLeft: 10, color: textColor, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{item.title}</Text>
                    </TouchableOpacity>
                  );
                }}
              />

              <TouchableOpacity onPress={apply} disabled={selectedListIds.length === 0} activeOpacity={0.8} style={{ height: 50, borderRadius: 15, backgroundColor: selectedListIds.length > 0 ? themePrimary : (isDarkMode ? '#3f3f46' : '#cbd5e1'), alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>{selectedListIds.length > 0 ? `Add ${selectedListIds.length} ${selectedListIds.length === 1 ? 'list' : 'lists'}` : 'Select a list'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
