import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Image, StyleSheet, Alert } from 'react-native';
import { useGacha } from '../state/useGacha';
import type { Item } from '../state/useGacha';

// ---- IMAGE MAPPINGS ----
// When your art is ready, place PNGs in /assets/pets and /assets/accessories
// and replace the `undefined` with `require('...')` for each species/accessory.
// Example: Panda: require('../../assets/pets/panda.png')
const PET_IMAGES: Record<string, any | undefined> = {
  Ferret: undefined,      // require('../../assets/pets/ferret.png')
  Raccoon: undefined,     // require('../../assets/pets/raccoon.png')
  Panda: undefined,       // require('../../assets/pets/panda.png')
  Nessie: undefined,      // require('../../assets/pets/nessie.png')
  Mothman: undefined,     // require('../../assets/pets/mothman.png')
  Chupacabra: undefined,  // require('../../assets/pets/chupacabra.png')
};

const ACCESSORY_IMAGES: Record<string, any | undefined> = {
  bow_red: undefined,     // require('../../assets/accessories/bow_red.png')
  cap_blue: undefined,    // require('../../assets/accessories/cap_blue.png')
  halo: undefined,        // require('../../assets/accessories/halo.png')
  crown: undefined,       // require('../../assets/accessories/crown.png')
};

// Emoji fallbacks (used until PNGs are added)
const SPECIES_EMOJI: Record<string, string> = {
  Ferret: '🦦',
  Raccoon: '🦝',
  Panda: '🐼',
  Nessie: '🦕',
  Mothman: '🦋',
  Chupacabra: '🐲',
};

export default function PetScreen() {
  const {
    hydrate,
    pet,
    inventory,
    equipAccessory,
    unequipAccessory,
    renamePet,
    setActiveCreature,
    convertDuplicatesInInventory,
    clearInventory,
    reconcilePet,
  } = useGacha();

  const [editingName, setEditingName] = useState(pet.name);

  useEffect(() => { hydrate(); }, []);
  useEffect(() => { setEditingName(pet.name); }, [pet.name]);

  const accessories = useMemo(() => inventory.filter(i => i.category === 'Accessory'), [inventory]);
  const creatures = useMemo(() => inventory.filter(i => i.category === 'Creature'), [inventory]);

  const isEquipped = (id: string) => pet.equippedAccessories.includes(id);

  const onToggleEquip = async (id: string) => {
    if (isEquipped(id)) await unequipAccessory(id);
    else await equipAccessory(id);
  };

  const onRename = async () => { await renamePet(editingName); };
  const onSetActive = async (itemId: string) => { await setActiveCreature(itemId); };

  const onConvertDupes = async () => {
    const res = await convertDuplicatesInInventory();
    const details = res.lines.length
      ? res.lines.map(l => `${l.name} (${l.rarity}) −${l.removed} → +${l.gems}`).join('\n')
      : 'No duplicates found.';
    Alert.alert('Duplicates converted', `${details}\n\nTotal gems: +${res.totalGems}`);
  };

  const onClearInv = async () => {
    await clearInventory();
    Alert.alert('Inventory cleared', 'Your inventory is now empty.');
  };

  // helper: render either PNG (when provided) or emoji fallback
  const renderPetVisual = (species: string) => {
    const img = PET_IMAGES[species];
    if (img) return <Image source={img} style={styles.petImage} resizeMode="contain" />;
    return <Text style={styles.petEmoji}>{SPECIES_EMOJI[species] ?? '🐾'}</Text>;
  };

  const renderAccessoryThumb = (it: Item) => {
    const img = ACCESSORY_IMAGES[it.id];
    if (img) return <Image source={img} style={styles.accImage} resizeMode="contain" />;
    // simple rarity tag if no art yet
    return (
      <View style={styles.accStub}>
        <Text style={{ fontSize: 12 }}>{it.rarity}</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700' }}>Your Pet</Text>
      {pet.leftAt ? (
        <View style={[styles.card, { borderColor: '#f00' }]}>
          <Text style={{ fontWeight: '700', color: '#f00' }}>
            {pet.name} has left due to stress.
          </Text>
          <Text style={{ marginTop: 6 }}>
            Apologize and comfort them to come back (cost: 50 gems).
          </Text>
          <Pressable
            onPress={async () => {
              const ok = await reconcilePet(50);
              Alert.alert(
                ok ? 'They came back!' : 'Not enough gems',
                ok ? `${pet.name} has returned.` : 'Earn more gems first.'
              );
            }}
            style={[styles.btn, { marginTop: 10 }]}
          >
            <Text>Apologize (−50 gems)</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={{ alignItems: 'center' }}>
          {renderPetVisual(pet.species)}
        </View>

        <Text style={{ fontWeight: '700', marginTop: 8 }}>{pet.name}</Text>
        <Text>Species: {pet.species}</Text>
        <Text>Level {pet.level} • Happiness {pet.happiness}/100</Text>
        <Text style={{ marginTop: 8, opacity: 0.7 }}>
          Equipped: {pet.equippedAccessories.length ? pet.equippedAccessories.join(', ') : 'None'}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TextInput
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Rename pet"
            accessibilityLabel="Rename pet"
            style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 }}
          />
          <Pressable onPress={onRename} accessibilityRole="button" style={styles.btn}>
            <Text>Save</Text>
          </Pressable>
        </View>

        {/* Inventory maintenance actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable onPress={onConvertDupes} style={styles.btn}>
            <Text>Convert duplicates → gems</Text>
          </Pressable>
          {__DEV__ && (
            <Pressable onPress={onClearInv} style={styles.btn}>
              <Text>Clear inventory (dev)</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Text style={{ marginTop: 16, fontWeight: '700' }}>Creatures</Text>
      <FlatList
        style={{ marginTop: 8 }}
        data={creatures}
        keyExtractor={(i, idx) => i.id + String(idx)}
        ListEmptyComponent={<Text>No creatures yet — try a gacha pull!</Text>}
        renderItem={({ item }) => {
          const isActive = pet.species === item.name;
          return (
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* Tiny emoji badge for creature list (swap to PNG later if desired) */}
                <Text style={{ fontSize: 20 }}>{SPECIES_EMOJI[item.name] ?? '🐾'}</Text>
                <View>
                  <Text style={{ fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ opacity: 0.7 }}>{item.rarity} • {item.category}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => onSetActive(item.id)}
                accessibilityRole="button"
                style={[styles.btn, isActive && { opacity: 0.6 }]}
                disabled={isActive}
              >
                <Text>{isActive ? 'Active' : 'Set Active'}</Text>
              </Pressable>
            </View>
          );
        }}
      />

      <Text style={{ marginTop: 16, fontWeight: '700' }}>Accessories</Text>
      <FlatList
        style={{ marginTop: 8 }}
        data={accessories}
        keyExtractor={(i, idx) => i.id + String(idx)}
        ListEmptyComponent={<Text>No accessories yet — pull from the gacha!</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {renderAccessoryThumb(item)}
              <View>
                <Text style={{ fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ opacity: 0.7 }}>{item.rarity} • {item.category}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => onToggleEquip(item.id)}
              accessibilityRole="button"
              style={styles.btn}
            >
              <Text>{isEquipped(item.id) ? 'Unequip' : 'Equip'}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  petEmoji: {
    fontSize: 56,
  },
  petImage: {
    width: 120,
    height: 120,
  },
  accImage: {
    width: 36,
    height: 36,
  },
  accStub: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
});
