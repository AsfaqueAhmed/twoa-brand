export interface Division {
  id: string;
  name: string;
}

export interface District {
  id: string;
  name: string;
  divisionId: string;
}

export interface Thana {
  id: string;
  name: string;
  districtId: string;
}

export const divisions: Division[] = [
  { id: 'dhaka', name: 'Dhaka' },
  { id: 'chattogram', name: 'Chattogram' },
  { id: 'rajshahi', name: 'Rajshahi' },
  { id: 'khulna', name: 'Khulna' },
  { id: 'barishal', name: 'Barishal' },
  { id: 'sylhet', name: 'Sylhet' },
  { id: 'rangpur', name: 'Rangpur' },
  { id: 'mymensingh', name: 'Mymensingh' },
];

export const districts: District[] = [
  // Dhaka Division
  { id: 'dhaka_dist', name: 'Dhaka', divisionId: 'dhaka' },
  { id: 'gazipur', name: 'Gazipur', divisionId: 'dhaka' },
  { id: 'narayanganj', name: 'Narayanganj', divisionId: 'dhaka' },
  { id: 'tangail', name: 'Tangail', divisionId: 'dhaka' },

  // Chattogram Division
  { id: 'chattogram_dist', name: 'Chattogram', divisionId: 'chattogram' },
  { id: 'coxs_bazar', name: "Cox's Bazar", divisionId: 'chattogram' },
  { id: 'cumilla', name: 'Cumilla', divisionId: 'chattogram' },

  // Rajshahi Division
  { id: 'rajshahi_dist', name: 'Rajshahi', divisionId: 'rajshahi' },
  { id: 'bogura', name: 'Bogura', divisionId: 'rajshahi' },
  { id: 'pabna', name: 'Pabna', divisionId: 'rajshahi' },

  // Khulna Division
  { id: 'khulna_dist', name: 'Khulna', divisionId: 'khulna' },
  { id: 'jashore', name: 'Jashore', divisionId: 'khulna' },
  { id: 'kushtia', name: 'Kushtia', divisionId: 'khulna' },

  // Barishal Division
  { id: 'barishal_dist', name: 'Barishal', divisionId: 'barishal' },
  { id: 'bhola', name: 'Bhola', divisionId: 'barishal' },
  { id: 'patuakhali', name: 'Patuakhali', divisionId: 'barishal' },

  // Sylhet Division
  { id: 'sylhet_dist', name: 'Sylhet', divisionId: 'sylhet' },
  { id: 'moulvibazar', name: 'Moulvibazar', divisionId: 'sylhet' },
  { id: 'habiganj', name: 'Habiganj', divisionId: 'sylhet' },

  // Rangpur Division
  { id: 'rangpur_dist', name: 'Rangpur', divisionId: 'rangpur' },
  { id: 'dinajpur', name: 'Dinajpur', divisionId: 'rangpur' },
  { id: 'kurigram', name: 'Kurigram', divisionId: 'rangpur' },

  // Mymensingh Division
  { id: 'mymensingh_dist', name: 'Mymensingh', divisionId: 'mymensingh' },
  { id: 'jamalpur', name: 'Jamalpur', divisionId: 'mymensingh' },
  { id: 'netrokona', name: 'Netrokona', divisionId: 'mymensingh' },
];

export const thanas: Thana[] = [
  // Dhaka District
  { id: 'mirpur', name: 'Mirpur', districtId: 'dhaka_dist' },
  { id: 'dhanmondi', name: 'Dhanmondi', districtId: 'dhaka_dist' },
  { id: 'gulshan', name: 'Gulshan', districtId: 'dhaka_dist' },
  { id: 'uttara', name: 'Uttara', districtId: 'dhaka_dist' },
  { id: 'motijheel', name: 'Motijheel', districtId: 'dhaka_dist' },
  { id: 'tejgaon', name: 'Tejgaon', districtId: 'dhaka_dist' },
  { id: 'mohammadpur', name: 'Mohammadpur', districtId: 'dhaka_dist' },
  { id: 'badda', name: 'Badda', districtId: 'dhaka_dist' },
  { id: 'khilgaon', name: 'Khilgaon', districtId: 'dhaka_dist' },
  { id: 'paltan', name: 'Paltan', districtId: 'dhaka_dist' },
  { id: 'cantonment', name: 'Cantonment', districtId: 'dhaka_dist' },
  { id: 'lalbagh', name: 'Lalbagh', districtId: 'dhaka_dist' },
  { id: 'savar', name: 'Savar', districtId: 'dhaka_dist' },
  { id: 'ashulia', name: 'Ashulia', districtId: 'dhaka_dist' },
  { id: 'keraniganj', name: 'Keraniganj', districtId: 'dhaka_dist' },
  { id: 'dhamrai', name: 'Dhamrai', districtId: 'dhaka_dist' },
  { id: 'dohar', name: 'Dohar', districtId: 'dhaka_dist' },
  { id: 'nawabganj', name: 'Nawabganj', districtId: 'dhaka_dist' },

  // Gazipur District
  { id: 'gazipur_sadar', name: 'Gazipur Sadar', districtId: 'gazipur' },
  { id: 'tongi', name: 'Tongi', districtId: 'gazipur' },
  { id: 'kaliakair', name: 'Kaliakair', districtId: 'gazipur' },
  { id: 'kaliganj', name: 'Kaliganj', districtId: 'gazipur' },
  { id: 'kapasia', name: 'Kapasia', districtId: 'gazipur' },
  { id: 'sreepur', name: 'Sreepur', districtId: 'gazipur' },

  // Narayanganj District
  { id: 'narayanganj_sadar', name: 'Narayanganj Sadar', districtId: 'narayanganj' },
  { id: 'araihazar', name: 'Araihazar', districtId: 'narayanganj' },
  { id: 'bandar', name: 'Bandar', districtId: 'narayanganj' },
  { id: 'rupanj', name: 'Rupganj', districtId: 'narayanganj' },
  { id: 'sonargaon', name: 'Sonargaon', districtId: 'narayanganj' },

  // Tangail District
  { id: 'tangail_sadar', name: 'Tangail Sadar', districtId: 'tangail' },
  { id: 'madhupur', name: 'Madhupur', districtId: 'tangail' },
  { id: 'mirzapur', name: 'Mirzapur', districtId: 'tangail' },

  // Chattogram District
  { id: 'kotwali', name: 'Kotwali', districtId: 'chattogram_dist' },
  { id: 'double_mooring', name: 'Double Mooring', districtId: 'chattogram_dist' },
  { id: 'halishahar', name: 'Halishahar', districtId: 'chattogram_dist' },
  { id: 'panchlaish', name: 'Panchlaish', districtId: 'chattogram_dist' },
  { id: 'hathazari', name: 'Hathazari', districtId: 'chattogram_dist' },
  { id: 'sandwip', name: 'Sandwip', districtId: 'chattogram_dist' },
  { id: 'sitakunda', name: 'Sitakunda', districtId: 'chattogram_dist' },
  { id: 'mirsharai', name: 'Mirsharai', districtId: 'chattogram_dist' },
  { id: 'patiya', name: 'Patiya', districtId: 'chattogram_dist' },

  // Cox's Bazar District
  { id: 'coxs_sadar', name: "Cox's Bazar Sadar", districtId: 'coxs_bazar' },
  { id: 'chakaria', name: 'Chakaria', districtId: 'coxs_bazar' },
  { id: 'maheshkhali', name: 'Maheshkhali', districtId: 'coxs_bazar' },
  { id: 'teknaf', name: 'Teknaf', districtId: 'coxs_bazar' },
  { id: 'ukhiya', name: 'Ukhiya', districtId: 'coxs_bazar' },
  { id: 'ramu', name: 'Ramu', districtId: 'coxs_bazar' },

  // Cumilla District
  { id: 'cumilla_sadar', name: 'Cumilla Sadar', districtId: 'cumilla' },
  { id: 'chauddagram', name: 'Chauddagram', districtId: 'cumilla' },
  { id: 'laksham', name: 'Laksham', districtId: 'cumilla' },

  // Rajshahi District
  { id: 'boalia', name: 'Boalia', districtId: 'rajshahi_dist' },
  { id: 'rajpara', name: 'Rajpara', districtId: 'rajshahi_dist' },
  { id: 'motihar', name: 'Motihar', districtId: 'rajshahi_dist' },
  { id: 'shah_makhdum', name: 'Shah Makhdum', districtId: 'rajshahi_dist' },
  { id: 'paba', name: 'Paba', districtId: 'rajshahi_dist' },
  { id: 'godagari', name: 'Godagari', districtId: 'rajshahi_dist' },

  // Bogura District
  { id: 'bogura_sadar', name: 'Bogura Sadar', districtId: 'bogura' },
  { id: 'sherpur', name: 'Sherpur', districtId: 'bogura' },
  { id: 'shajahanpur', name: 'Shajahanpur', districtId: 'bogura' },
  { id: 'shibganj', name: 'Shibganj', districtId: 'bogura' },

  // Pabna District
  { id: 'pabna_sadar', name: 'Pabna Sadar', districtId: 'pabna' },
  { id: 'ishwardi', name: 'Ishwardi', districtId: 'pabna' },
  { id: 'sujanagar', name: 'Sujanagar', districtId: 'pabna' },

  // Khulna District
  { id: 'khulna_sadar', name: 'Khulna Sadar', districtId: 'khulna_dist' },
  { id: 'sonadanga', name: 'Sonadanga', districtId: 'khulna_dist' },
  { id: 'halishpur', name: 'Khalishpur', districtId: 'khulna_dist' },
  { id: 'daulatpur', name: 'Daulatpur', districtId: 'khulna_dist' },
  { id: 'rupsha', name: 'Rupsha', districtId: 'khulna_dist' },

  // Jashore District
  { id: 'jashore_sadar', name: 'Jashore Sadar', districtId: 'jashore' },
  { id: 'jhikargachha', name: 'Jhikargachha', districtId: 'jashore' },
  { id: 'keshabpur', name: 'Keshabpur', districtId: 'jashore' },

  // Kushtia District
  { id: 'kushtia_sadar', name: 'Kushtia Sadar', districtId: 'kushtia' },
  { id: 'kumarkhali', name: 'Kumarkhali', districtId: 'kushtia' },

  // Barishal District
  { id: 'barishal_sadar', name: 'Barishal Sadar', districtId: 'barishal_dist' },
  { id: 'bakerganj', name: 'Bakerganj', districtId: 'barishal_dist' },
  { id: 'babuganj', name: 'Babuganj', districtId: 'barishal_dist' },

  // Bhola District
  { id: 'bhola_sadar', name: 'Bhola Sadar', districtId: 'bhola' },
  { id: 'char_fasson', name: 'Char Fasson', districtId: 'bhola' },

  // Patuakhali District
  { id: 'patuakhali_sadar', name: 'Patuakhali Sadar', districtId: 'patuakhali' },
  { id: 'galachipa', name: 'Galachipa', districtId: 'patuakhali' },

  // Sylhet District
  { id: 'sylhet_sadar', name: 'Sylhet Sadar', districtId: 'sylhet_dist' },
  { id: 'beanibazar', name: 'Beanibazar', districtId: 'sylhet_dist' },
  { id: 'bishwanath', name: 'Bishwanath', districtId: 'sylhet_dist' },
  { id: 'fenchuganj', name: 'Fenchuganj', districtId: 'sylhet_dist' },

  // Moulvibazar District
  { id: 'moulvibazar_sadar', name: 'Moulvibazar Sadar', districtId: 'moulvibazar' },
  { id: 'sreemangal', name: 'Sreemangal', districtId: 'moulvibazar' },
  { id: 'kulaura', name: 'Kulaura', districtId: 'moulvibazar' },

  // Habiganj District
  { id: 'habiganj_sadar', name: 'Habiganj Sadar', districtId: 'habiganj' },
  { id: 'nabiganj', name: 'Nabiganj', districtId: 'habiganj' },

  // Rangpur District
  { id: 'rangpur_sadar', name: 'Rangpur Sadar', districtId: 'rangpur_dist' },
  { id: 'mithapukur', name: 'Mithapukur', districtId: 'rangpur_dist' },
  { id: 'pirganj', name: 'Pirganj', districtId: 'rangpur_dist' },

  // Dinajpur District
  { id: 'dinajpur_sadar', name: 'Dinajpur Sadar', districtId: 'dinajpur' },
  { id: 'birganj', name: 'Birganj', districtId: 'dinajpur' },

  // Kurigram District
  { id: 'kurigram_sadar', name: 'Kurigram Sadar', districtId: 'kurigram' },
  { id: 'ulipur', name: 'Ulipur', districtId: 'kurigram' },

  // Mymensingh District
  { id: 'mymensingh_sadar', name: 'Mymensingh Sadar', districtId: 'mymensingh_dist' },
  { id: 'muktagachha', name: 'Muktagachha', districtId: 'mymensingh_dist' },
  { id: 'bhaluka', name: 'Bhaluka', districtId: 'mymensingh_dist' },

  // Jamalpur District
  { id: 'jamalpur_sadar', name: 'Jamalpur Sadar', districtId: 'jamalpur' },
  { id: 'dewanganj', name: 'Dewanganj', districtId: 'jamalpur' },

  // Netrokona District
  { id: 'netrokona_sadar', name: 'Netrokona Sadar', districtId: 'netrokona' },
  { id: 'mohanganj', name: 'Mohanganj', districtId: 'netrokona' },
];

export const cityCorporations = [
  { id: 'dncc', name: 'Dhaka North City Corporation (DNCC)' },
  { id: 'dscc', name: 'Dhaka South City Corporation (DSCC)' },
  { id: 'outside_cc', name: 'Outside City Corporation (N/A)' },
];
