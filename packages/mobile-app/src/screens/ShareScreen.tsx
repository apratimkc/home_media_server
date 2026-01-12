import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';

interface SharedFolder {
  id: string;
  path: string;
  alias: string;
  enabled: boolean;
}

function ShareScreen() {
  const [shareEnabled, setShareEnabled] = useState(false);
  const [folders, setFolders] = useState<SharedFolder[]>([]);

  const handleToggleShare = () => {
    if (!shareEnabled && folders.length === 0) {
      Alert.alert(
        'No Folders',
        'Add at least one folder before enabling sharing.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShareEnabled(!shareEnabled);
  };

  const handleAddFolder = () => {
    // In a real app, this would open a folder picker
    Alert.alert(
      'Add Folder',
      'Folder picker would open here. This requires native file picker integration.',
      [{ text: 'OK' }]
    );
  };

  const handleToggleFolder = (folderId: string) => {
    setFolders(
      folders.map((f) => (f.id === folderId ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleRemoveFolder = (folderId: string) => {
    Alert.alert('Remove Folder', 'Are you sure you want to stop sharing this folder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setFolders(folders.filter((f) => f.id !== folderId)),
      },
    ]);
  };

  const renderFolder = ({ item: folder }: { item: SharedFolder }) => (
    <View style={styles.folderItem}>
      <Text style={styles.folderIcon}>📁</Text>
      <View style={styles.folderInfo}>
        <Text style={styles.folderName}>{folder.alias}</Text>
        <Text style={styles.folderPath} numberOfLines={1}>
          {folder.path}
        </Text>
      </View>
      <Switch
        value={folder.enabled}
        onValueChange={() => handleToggleFolder(folder.id)}
        trackColor={{ false: '#334155', true: '#22c55e' }}
        thumbColor="#f8fafc"
      />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFolder(folder.id)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Share Toggle */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Enable Sharing</Text>
            <Text style={styles.toggleDescription}>
              Allow other devices to browse your shared folders
            </Text>
          </View>
          <Switch
            value={shareEnabled}
            onValueChange={handleToggleShare}
            trackColor={{ false: '#334155', true: '#22c55e' }}
            thumbColor="#f8fafc"
          />
        </View>
      </View>

      {/* Shared Folders */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Shared Folders</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddFolder}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {folders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>No folders shared</Text>
            <Text style={styles.emptyText}>Add folders to share them with other devices</Text>
          </View>
        ) : (
          <FlatList
            data={folders}
            keyExtractor={(item) => item.id}
            renderItem={renderFolder}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Server Info */}
      {shareEnabled && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Server Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>Running</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Port:</Text>
            <Text style={styles.infoValue}>8765</Text>
          </View>
          <Text style={styles.infoNote}>
            Other devices can discover this phone automatically via network
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDescription: {
    color: '#94a3b8',
    fontSize: 13,
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  folderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
  },
  folderPath: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
    width: 60,
  },
  infoValue: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  infoNote: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 12,
  },
});

export default ShareScreen;
