import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';

interface Settings {
  deviceName: string;
  serverPort: string;
  autoDownloadEnabled: boolean;
  autoDeleteDays: string;
}

function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({
    deviceName: 'My Android Phone',
    serverPort: '8765',
    autoDownloadEnabled: true,
    autoDeleteDays: '10',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate save
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert('Success', 'Settings saved!');
    }, 500);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Device Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Device Name</Text>
          <TextInput
            style={styles.input}
            value={settings.deviceName}
            onChangeText={(text) => setSettings({ ...settings, deviceName: text })}
            placeholder="My Android Phone"
            placeholderTextColor="#64748b"
          />
          <Text style={styles.hint}>This name will be shown to other devices on the network</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Server Port</Text>
          <TextInput
            style={styles.input}
            value={settings.serverPort}
            onChangeText={(text) => setSettings({ ...settings, serverPort: text })}
            placeholder="8765"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>Port used for file sharing (default: 8765)</Text>
        </View>
      </View>

      {/* Auto-Download Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Auto-Download</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.label}>Enable Auto-Download</Text>
            <Text style={styles.hint}>
              Automatically download current + next 2 episodes when playing
            </Text>
          </View>
          <Switch
            value={settings.autoDownloadEnabled}
            onValueChange={(value) =>
              setSettings({ ...settings, autoDownloadEnabled: value })
            }
            trackColor={{ false: '#334155', true: '#22c55e' }}
            thumbColor="#f8fafc"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Auto-Delete After (Days)</Text>
          <TextInput
            style={styles.input}
            value={settings.autoDeleteDays}
            onChangeText={(text) => setSettings({ ...settings, autoDeleteDays: text })}
            placeholder="10"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>Auto-downloaded files will be deleted after this many days</Text>
        </View>
      </View>

      {/* Storage Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Storage</Text>
        <View style={styles.storageInfo}>
          <Text style={styles.storageText}>Download Location: Internal Storage/Home Media Server</Text>
          <View style={styles.storageBar}>
            <View style={[styles.storageUsed, { width: '35%' }]} />
          </View>
          <Text style={styles.storageText}>12.5 GB used of 64 GB</Text>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Settings'}</Text>
      </TouchableOpacity>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <Text style={styles.aboutText}>Home Media Server v1.0.0</Text>
        <Text style={styles.aboutText}>Share and stream media files across your local network</Text>
      </View>
    </ScrollView>
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
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    fontSize: 15,
  },
  hint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  storageInfo: {
    marginTop: 8,
  },
  storageText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  storageBar: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  storageUsed: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aboutText: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
});

export default SettingsScreen;
