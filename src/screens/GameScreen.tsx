// src/screens/GameScreen.tsx
import { View, Text, Pressable, FlatList, Alert, Modal } from 'react-native';
import { useGacha, type PullResult } from '../state/useGacha';
import { useEffect, useState } from 'react';

export default function GameScreen() {
  const { hydrate, gems, pet, pullOnce, pullTen, feedPet, inventory } = useGacha();
  const [resultsVisible, setResultsVisible] = useState(false);
  const [results, setResults] = useState<PullResult[]>([]);

  useEffect(() => { hydrate(); }, []);

  async function onPull() {
    const r = await pullOnce();
    if (!r) { Alert.alert('Not enough gems', 'You need 10 gems for a pull.'); return; }
    setResults([r]);
    setResultsVisible(true);
  }

  async function onPullTen() {
    const rs = await pullTen();
    if (!rs) { Alert.alert('Not enough gems', 'You need 100 gems for a 10x pull.'); return; }
    setResults(rs);
    setResultsVisible(true);
  }

  const totalBonus = results.reduce((sum, r) => sum + r.gemsAwarded, 0);

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text accessibilityRole="header" style={{ fontSize:22, fontWeight:'700' }}>Your Pet</Text>
      <View style={{ marginTop:8, padding:16, borderWidth:1, borderRadius:12 }}>
        <Text>Name: {pet.name}</Text>
        <Text>Level: {pet.level}</Text>
        <Text>Happiness: {pet.happiness}/100</Text>
        <Pressable onPress={() => feedPet(15)} style={{ marginTop:10, padding:10, borderWidth:1, borderRadius:8 }}>
          <Text>Feed ( +15 happiness )</Text>
        </Pressable>
      </View>

      <View style={{ marginTop:16, padding:16, borderWidth:1, borderRadius:12 }}>
        <Text style={{ fontWeight:'600' }}>Gems: {gems}</Text>

        <Pressable onPress={onPull}
          style={{ marginTop:10, padding:12, backgroundColor:'#111', borderRadius:10 }}>
          <Text style={{ color:'#fff', textAlign:'center' }}>Pull (10 gems)</Text>
        </Pressable>

        <Pressable onPress={onPullTen}
          style={{ marginTop:10, padding:12, backgroundColor:'#111', borderRadius:10 }}>
          <Text style={{ color:'#fff', textAlign:'center' }}>Pull x10 (100 gems)</Text>
        </Pressable>
      </View>

      <Text style={{ marginTop:16, fontWeight:'700' }}>Inventory</Text>
      <FlatList
        style={{ marginTop:8 }}
        data={inventory}
        keyExtractor={(i, idx) => i.id + String(idx)}
        ListEmptyComponent={<Text>No items yet. Complete tasks to earn gems!</Text>}
        renderItem={({ item }) => (
          <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#eee' }}>
            <Text>{item.name} — {item.rarity}</Text>
          </View>
        )}
      />

      {/* Results Modal */}
      <Modal
        visible={resultsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResultsVisible(false)}
      >
        <View style={{
          flex:1, backgroundColor:'rgba(0,0,0,0.5)',
          justifyContent:'center', alignItems:'center', padding:16
        }}>
          <View style={{ width:'100%', maxWidth:500, backgroundColor:'#fff', borderRadius:12, padding:16 }}>
            <Text style={{ fontSize:18, fontWeight:'700' }}>Pull Results</Text>
            <FlatList
              style={{ marginTop:8, maxHeight:320 }}
              data={results}
              keyExtractor={(_, idx) => String(idx)}
              renderItem={({ item }) => (
                <View style={{ paddingVertical:10, borderBottomWidth:1, borderColor:'#eee', flexDirection:'row', justifyContent:'space-between' }}>
                  <View>
                    <Text style={{ fontWeight:'600' }}>{item.item.name}</Text>
                    <Text style={{ opacity:0.7 }}>{item.item.rarity} • {item.item.category}</Text>
                  </View>
                  {item.duplicate ? (
                    <Text>Duplicate → +{item.gemsAwarded} gems</Text>
                  ) : (
                    <Text style={{ fontWeight:'700' }}>NEW!</Text>
                  )}
                </View>
              )}
              ListEmptyComponent={<Text>No results</Text>}
            />
            {totalBonus > 0 ? (
              <Text style={{ marginTop:8, fontWeight:'600' }}>Total bonus gems: +{totalBonus}</Text>
            ) : null}

            <Pressable
              onPress={() => setResultsVisible(false)}
              style={{ marginTop:12, padding:12, borderWidth:1, borderRadius:8, alignSelf:'flex-end' }}
            >
              <Text>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
