/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SampleProduct {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  multilingualNames: Array<{ language: string; name: string }>;
  defaultDaysOffset: number; // to generate expiry date near current date
  flavorDetails: string;
}

export const sampleProducts: SampleProduct[] = [
  {
    id: "sample-alpro-almond",
    name: "Alpro Mandel Original",
    brand: "Alpro",
    imageUrl: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&auto=format&fit=crop&q=60",
    multilingualNames: [
      { language: "Deutsch", name: "Alpro Mandel Original" },
      { language: "English", name: "Alpro Almond Original" },
      { language: "Türkçe", name: "Alpro Badem Sütü Orijinal" }
    ],
    defaultDaysOffset: 3, // expires in 3 days
    flavorDetails: "Natur / Orijinal / Original Almond milk"
  },
  {
    id: "sample-ulker-potibor",
    name: "Ülker Pötibör",
    brand: "Ülker",
    imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=60",
    multilingualNames: [
      { language: "Türkçe", name: "Ülker Pötibör Sade" },
      { language: "English", name: "Ülker Petit Beurre Biscuits" },
      { language: "Deutsch", name: "Ülker Butterkeks Klassik" }
    ],
    defaultDaysOffset: 0, // expires today!
    flavorDetails: "Sade / Classic Butter Biscuits"
  },
  {
    id: "sample-ritter-sport",
    name: "Ritter Sport Marzipan",
    brand: "Ritter Sport",
    imageUrl: "https://images.unsplash.com/photo-1548907040-4d42b52145ca?w=400&auto=format&fit=crop&q=60",
    multilingualNames: [
      { language: "Deutsch", name: "Ritter Sport Edel-Marzipan" },
      { language: "English", name: "Ritter Sport Fine Marzipan" },
      { language: "Türkçe", name: "Ritter Sport Badem Ezmeli Çikolata" }
    ],
    defaultDaysOffset: 1, // expires tomorrow!
    flavorDetails: "Edel-Marzipan / Fine Marzipan 100g"
  },
  {
    id: "sample-alpro-soy",
    name: "Alpro Soja Original",
    brand: "Alpro",
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=60",
    multilingualNames: [
      { language: "Deutsch", name: "Alpro Soja Original" },
      { language: "English", name: "Alpro Soya Milk Classic" },
      { language: "Türkçe", name: "Alpro Soya Sütü Orijinal" }
    ],
    defaultDaysOffset: 3, // Same expiry date as Almond milk to trigger duplicate comparison!
    flavorDetails: "Soja Protein Classic Drink"
  },
  {
    id: "sample-ulker-ciko",
    name: "Ülker Pötibör Kakaolu",
    brand: "Ülker",
    imageUrl: "https://images.unsplash.com/photo-1558961309-dbdf71799f5a?w=400&auto=format&fit=crop&q=60",
    multilingualNames: [
      { language: "Türkçe", name: "Ülker Pötibör Kakaolu" },
      { language: "English", name: "Ülker Cocoa Biscuits" },
      { language: "Deutsch", name: "Ülker Butterkeks Kakao" }
    ],
    defaultDaysOffset: 0, // Same expiry date as classic Potibor to trigger the flavor/duplicate check!
    flavorDetails: "Kakaolu / Cocoa Butter Biscuits"
  }
];
