import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {
  useDevicesStore,
  useFilesStore,
  Device,
  MediaFile,
  DeviceApiClient,
  formatFileSize,
} from '@home-media-server/shared';

function DiscoverScreen() {
  const devices = useDevicesStore((state) => state.devices);
  const selectedDevice = useDevicesStore((state) => state.selectedDevice);
  const selectDevice = useDevicesStore((state) => state.selectDevice);

  const files = useFilesStore((state) => state.files);
  const currentPath = useFilesStore((state) => state.currentPath);
  const isLoading = useFilesStore((state) => state.isLoading);
  const setFiles = useFilesStore((state) => state.setFiles);
  const navigateTo = useFilesStore((state) => state.navigateTo);
  const goBack = useFilesStore((state) => state.goBack);
  const setLoading = useFilesStore((state) => state.setLoading);
  const clear = useFilesStore((state) => state.clear);

  const [apiClient, setApiClient] = useState<DeviceApiClient | null>(null);

  const handleDevicePress = async (device: Device) => {
    clear();
    selectDevice(device);
    const client = new DeviceApiClient(device.ip, device.port);
    setApiClient(client);

    setLoading(true);
    try {
      const response = await client.listFiles('/');
      setFiles(response.items as MediaFile[], '/');
    } catch (error) {
      console.error('Failed to load files:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to connect to device');
    }
  };

  const handleFolderPress = async (folder: MediaFile) => {
    if (!apiClient) return;
    navigateTo(folder.path);

    try {
      const response = await apiClient.listFiles(folder.path);
      setFiles(response.items as MediaFile[], folder.path);
    } catch (error) {
      console.error('Failed to load folder:', error);
      setLoading(false);
    }
  };

  const handleBackPress = async () => {
    if (!apiClient) return;
    const previousPath = goBack();

    if (previousPath) {
      try {
        const response = await apiClient.listFiles(previousPath);
        setFiles(response.items as MediaFile[], previousPath);
      } catch (error) {
        console.error('Failed to load folder:', error);
        setLoading(false);
      }
    }
  };

  const handleFilePress = async (file: MediaFile) => {
    if (!apiClient || !selectedDevice) return;

    const streamUrl = apiClient.getStreamUrl(file.id);

    // Try to open with VLC
    const vlcUrl = `vlc://${streamUrl}`;
    const canOpen = await Linking.canOpenURL(vlcUrl);

    if (canOpen) {
      await Linking.openURL(vlcUrl);
    } else {
      // Fallback to regular URL
      await Linking.openURL(streamUrl);
    }
  };

  const getFileIcon = (file: MediaFile): string => {
    if (file.type === 'folder') return '📁';
    switch (file.mediaType) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'image':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const renderDevice = ({ item: device }: { item: Device }) => (
    <TouchableOpacity style={styles.deviceCard} onPress={() => handleDevicePress(device)}>
      <Text style={styles.deviceIcon}>{device.platform === 'windows' ? '💻' : '📱'}</Text>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{device.name}</Text>
        <View style={styles.deviceStatus}>
          <View style={[styles.statusDot, !device.isOnline && styles.statusOffline]} />
          <Text style={styles.statusText}>
            {device.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFile = ({ item: file }: { item: MediaFile }) => (
    <TouchableOpacity
      style={styles.fileItem}
      onPress={() => (file.type === 'folder' ? handleFolderPress(file) : handleFilePress(file))}
    >
      <Text style={styles.fileIcon}>{getFileIcon(file)}</Text>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.name}
        </Text>
        {file.type === 'file' && file.size !== undefined && (
          <Text style={styles.fileMeta}>{formatFileSize(file.size)}</Text>
        )}
      </View>
      {file.type === 'file' && (
        <TouchableOpacity style={styles.playButton} onPress={() => handleFilePress(file)}>
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (!selectedDevice) {
    return (
      <View style={styles.container}>
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyTitle}>No devices found</Text>
            <Text style={styles.emptyText}>
              Make sure other devices are running Home Media Server on your network
            </Text>
          </View>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            renderItem={renderDevice}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            clear();
            selectDevice(null);
            setApiClient(null);
          }}
        >
          <Text style={styles.backButtonText}>← Devices</Text>
        </TouchableOpacity>
        {currentPath !== '/' && (
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.pathText}>
        {selectedDevice.name} • {currentPath}
      </Text>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : files.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>This folder is empty</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          renderItem={renderFile}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  list: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  backButton: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#f8fafc',
    fontSize: 14,
  },
  pathText: {
    color: '#94a3b8',
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  deviceIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  statusOffline: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
  },
  fileMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DiscoverScreen;
