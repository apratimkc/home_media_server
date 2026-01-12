import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useDownloadsStore, Download, formatFileSize } from '@home-media-server/shared';

function DownloadsScreen() {
  const downloads = useDownloadsStore((state) => state.downloads);
  const removeDownload = useDownloadsStore((state) => state.removeDownload);
  const pauseDownload = useDownloadsStore((state) => state.pauseDownload);
  const resumeDownload = useDownloadsStore((state) => state.resumeDownload);
  const clearCompleted = useDownloadsStore((state) => state.clearCompleted);

  const activeDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued' || d.status === 'paused'
  );
  const completedDownloads = downloads.filter((d) => d.status === 'completed');

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'downloading':
        return 'Downloading';
      case 'queued':
        return 'Queued';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'paused':
        return 'Paused';
      default:
        return status;
    }
  };

  const formatExpiry = (expiresAt?: Date): string => {
    if (!expiresAt) return '';
    const now = new Date();
    const expiry = new Date(expiresAt);
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const renderActiveDownload = ({ item: download }: { item: Download }) => (
    <View style={styles.downloadItem}>
      <View style={styles.downloadHeader}>
        <View style={styles.downloadInfo}>
          <Text style={styles.downloadName} numberOfLines={1}>
            {download.fileName}
          </Text>
          <Text style={styles.downloadSource}>From: {download.sourceDeviceName}</Text>
        </View>
        <View style={[styles.statusBadge, download.status === 'paused' && styles.statusPaused]}>
          <Text style={styles.statusText}>{getStatusLabel(download.status)}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${download.progress}%` }]} />
      </View>

      <View style={styles.downloadFooter}>
        <Text style={styles.progressText}>
          {formatFileSize(download.downloadedBytes)} / {formatFileSize(download.totalBytes)}
        </Text>
        <View style={styles.actions}>
          {download.status === 'downloading' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => pauseDownload(download.id)}
            >
              <Text style={styles.actionButtonText}>Pause</Text>
            </TouchableOpacity>
          )}
          {download.status === 'paused' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => resumeDownload(download.id)}
            >
              <Text style={styles.actionButtonText}>Resume</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => removeDownload(download.id)}
          >
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCompletedDownload = ({ item: download }: { item: Download }) => (
    <View style={styles.downloadItem}>
      <View style={styles.downloadHeader}>
        <View style={styles.downloadInfo}>
          <Text style={styles.downloadName} numberOfLines={1}>
            {download.fileName}
          </Text>
          <Text style={styles.downloadSource}>From: {download.sourceDeviceName}</Text>
        </View>
        <View style={[styles.statusBadge, styles.statusCompleted]}>
          <Text style={styles.statusText}>Completed</Text>
        </View>
      </View>

      <View style={styles.downloadFooter}>
        <Text style={styles.metaText}>
          {formatFileSize(download.totalBytes)}
          {download.isAutoDownload && ' • Auto-downloaded'}
          {download.expiresAt && ` • ${formatExpiry(download.expiresAt)}`}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
            <Text style={styles.actionButtonText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => removeDownload(download.id)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Active Downloads */}
      {activeDownloads.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Active Downloads ({activeDownloads.length})
          </Text>
          <FlatList
            data={activeDownloads}
            keyExtractor={(item) => item.id}
            renderItem={renderActiveDownload}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Completed Downloads */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Completed ({completedDownloads.length})
          </Text>
          {completedDownloads.length > 0 && (
            <TouchableOpacity onPress={clearCompleted}>
              <Text style={styles.clearButton}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {completedDownloads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📥</Text>
            <Text style={styles.emptyTitle}>No completed downloads</Text>
            <Text style={styles.emptyText}>Your completed downloads will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={completedDownloads}
            keyExtractor={(item) => item.id}
            renderItem={renderCompletedDownload}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Empty State */}
      {downloads.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📥</Text>
          <Text style={styles.emptyTitle}>No downloads yet</Text>
          <Text style={styles.emptyText}>Download files from other devices to see them here</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  clearButton: {
    color: '#6366f1',
    fontSize: 14,
  },
  downloadItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  downloadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  downloadInfo: {
    flex: 1,
    marginRight: 12,
  },
  downloadName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  downloadSource: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: '#334155',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusPaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusText: {
    color: '#f8fafc',
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progress: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  downloadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
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

export default DownloadsScreen;
