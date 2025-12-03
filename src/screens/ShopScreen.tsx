import { View, Text, Pressable, Alert } from 'react-native';
import { useGacha } from '../state/useGacha';

export default function ShopScreen() {
  const { gems, addGems, feedPet } = useGacha();

  async function buyGems(n: number, price: number) {
    // no real money—just pretend purchase
    await addGems(n);
    Alert.alert('Purchase successful', `+${n} gems`);
  }

  async function buyFood() {
    const ok = await useGacha.getState().spendGems(2);
    if (!ok) { Alert.alert('Not enough gems', 'Food costs 2 gems'); return; }
    await feedPet(10);
    Alert.alert('Nom!', 'Your pet is happier.');
  }

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text accessibilityRole="header" style={{ fontSize:22, fontWeight:'700' }}>Shop</Text>
      <Text style={{ marginTop:8 }}>Your gems: {gems}</Text>

      <View style={{ marginTop:16, gap:10 }}>
        <Pressable onPress={() => buyGems(20, 0)} style={{ padding:12, borderWidth:1, borderRadius:10 }}>
          <Text>Gem Pack: +20 (free demo)</Text>
        </Pressable>
        <Pressable onPress={() => buyGems(100, 0)} style={{ padding:12, borderWidth:1, borderRadius:10 }}>
          <Text>Gem Pack: +100 (free demo)</Text>
        </Pressable>
      </View>

      <View style={{ marginTop:24 }}>
        <Text style={{ fontWeight:'700', marginBottom:8 }}>Pet Care</Text>
        <Pressable onPress={buyFood} style={{ padding:12, borderWidth:1, borderRadius:10 }}>
          <Text>Food ( +10 happiness ) — 2 gems</Text>
        </Pressable>
      </View>
    </View>
  );
}
