import type { Product } from "./types";

export const mockProducts: Product[] = [
  {
    id: "1",
    slug: "gauze-bib",
    name: "GAUZE BIB",
    nameKo: "거즈 빕",
    description:
      "국내산 면 100% 6겹 거즈로 만든 턱받이입니다. 겹겹이 쌓인 거즈 특유의 입체감이 흡수력과 부드러움을 동시에 갖추고 있어, 먹이고 닦고 받아내는 매일의 순간을 조금 더 편안하게 만들어줍니다. 신생아부터 사용할 수 있는 프리 사이즈로, 넉넉한 크기 덕분에 이유식 시기에도 유용하게 쓰입니다.",
    tagline: "SMALL THINGS GAUZE BIB · 매일 닿는 아기 피부를 위한 6겹 거즈 턱받이 · ₩16,000",
    price: 16000,
    // 대표 이미지는 기본 선택 컬러(Cream)의 단독 컷. 컬러 선택 시 colors[].image로 대체됨
    imageUrl: "/products/턱받이9.png",
    // TODO: 아기 착용 정면/옆면 사진 없음 — 촬영 후 배열 2번째 자리에 추가 (현재는 전체컬러·디테일만 포함)
    images: [
      "/products/턱받이1.png",
      "/products/턱받이3.png",
    ],
    // TODO: Blush/Royal Blue/Yellow 컬러칩 hex는 실제 원단 색상 대조 후 조정 필요 (근사치로 반영됨)
    colors: [
      { name: "Cream", hex: "#EFE4D4", image: "/products/턱받이9.png" },
      { name: "Mint", hex: "#A8C4B4", image: "/products/턱받이6.png" },
      { name: "Rose Pink", hex: "#CE9096", image: "/products/턱받이11.png" },
      { name: "Blush", hex: "#E8C9C2", image: "/products/턱받이8.png" },
      { name: "Yellow Green", hex: "#CDD678", image: "/products/턱받이7.png" },
      { name: "Royal Blue", hex: "#4A5FA5", image: "/products/턱받이12.png" },
      { name: "Yellow", hex: "#EAD98A", image: "/products/턱받이10.png" },
    ],
    category: "small-things",
    stock: 80,
    material:
      "국내산 면 100% 6겹 거즈\n\n거즈는 실을 성기게 직조한 평직 원단으로, 겹칠수록 공기층이 생겨 한 장의 두꺼운 천보다 부드럽고 흡수력이 높습니다. Amori의 거즈 빕은 3중 거즈 원단을 두 겹 사용해 총 6겹 구조로 완성되어 침, 분유, 이유식 등을 효과적으로 흡수하며, 세탁을 반복할수록 섬유가 살짝 수축되며 더욱 촘촘하고 포근한 질감으로 변합니다.\n\n· 소재: 면(cotton) 100%\n· 원산지: 국내산\n· KC 안전 인증 완료 (어린이제품 공통안전기준)",
    // TODO: 목둘레 실측 확인 필요 — 확인 후 사이즈표에 추가
    sizeGuide:
      "프리 사이즈 (신생아 ~ 36개월)\n\n· 가로 24cm × 세로 27.5cm\n· 신생아부터 36개월까지, 착용 가능 시기는 아이의 체형에 따라 달라질 수 있으니 구매 전 상세 사이즈를 확인해 주세요.\n· 이유식 시기(6개월~)에는 앞면 전체를 충분히 가려주어 옷이 젖는 것을 막아줍니다.",
    careInstructions:
      "· 세탁: 30°C 이하 찬물, 중성세제 사용\n· 단독 또는 유사 색상끼리 세탁 권장\n· 손세탁 또는 세탁기 약세탁(울 코스)\n· 건조기 사용 불가 — 수축 및 변형의 원인이 됩니다\n· 그늘에서 자연 건조\n· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다\n· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)",
    detailIntro:
      "매일 입히고 싶은, 부드러운 거즈빕\n\n하루에도 몇 번씩 갈아주는 아기 턱받이. 피부에는 부드럽고, 침과 음식물은 충분히 받아주면서 어떤 옷에도 자연스럽게 어울리는 빕을 만들고 싶었어요.\n\n아모리 거즈빕은 국내산 면 100% 거즈 원단을 사용해 가볍고 포근하게 완성했습니다. 넉넉한 앞면이 아기의 옷을 편안하게 감싸주어 수유부터 이유식 시기까지 매일 손이 가는 턱받이입니다.",
    features: [
      {
        label: "포근한 6겹 거즈",
        body: "국내산 면 100% 3중 거즈 원단을 두 겹으로 사용해 부드러우면서도 충분한 흡수력을 갖췄습니다.",
      },
      {
        label: "넉넉한 앞면",
        body: "침과 음식물이 묻기 쉬운 목 아래와 가슴 부분을 편안하게 감싸도록 넉넉한 크기로 만들었습니다.",
      },
      {
        label: "편안한 착용감",
        body: "가볍고 통기성이 좋은 거즈 소재로 계절에 관계없이 편안하게 착용할 수 있습니다.",
      },
      {
        label: "KC 안전기준 확인",
        body: "아기 피부에 직접 닿는 제품인 만큼 어린이제품 안전기준에 따른 시험을 완료했습니다. (인증번호: CB014H2463-6001)",
      },
    ],
    brandStory:
      "아이가 먹고, 흘리고, 또 먹는 하루하루 — 그 작은 반복 속에서 곁을 지키는 것들은 단순하고 믿음직해야 한다고 생각합니다. Amori의 거즈 빕은 꾸밈보다 실용에, 세련됨보다 안전함에 집중했습니다. 아이의 피부에 가장 먼저 닿는 것이니까요.",
    rating: 4.9,
    reviewCount: 0,
    createdAt: "2025-04-01",
  },
  {
    id: "2",
    slug: "gauze-scarf-bib",
    name: "GAUZE SCARF BIB",
    nameKo: "거즈 스카프 빕",
    price: 13000,
    imageUrl: "/products/scarf-1.png",
    images: [
      "/products/scarf-2.png",
      "/products/scarf-3.png",
      "/products/scarf-4.png",
      "/products/scarf-5.png",
    ],
    colors: [
      { name: "옐로우그린", hex: "#CDD678" },
      { name: "민트", hex: "#A8C4B4" },
      { name: "로즈핑크", hex: "#CE9096" },
      { name: "크림", hex: "#EFE4D4" },
    ],
    category: "small-things",
    stock: 80,
    description:
      "국내산 면 100% 6겹 거즈로 만든 스카프형 턱받이입니다. 삼각형으로 재단된 넓은 앞판이 목부터 가슴까지 충분히 감싸주어, 이유식이나 수유 중 옷이 젖는 것을 효과적으로 막아줍니다. 스카프처럼 자연스럽게 연출되어 집에서도 외출 시에도 편안하게 착용할 수 있습니다.",
    material:
      "국내산 면 100% 6겹 거즈\n\n거즈 특유의 성긴 직조 방식이 겹칠수록 공기층을 형성해 부드럽고 흡수력이 뛰어납니다. Amori의 거즈 스카프 빕은 6겹 구조로 직조되어 침과 음식물을 빠르게 흡수하며, 세탁을 반복할수록 섬유가 수축되어 더욱 촘촘하고 포근한 질감으로 변합니다.\n\n· 소재: 면(cotton) 100%\n· 원산지: 국내산\n· KC 안전 인증 완료 (어린이제품 공통안전기준)",
    sizeGuide:
      "프리 사이즈 (신생아 ~ 24개월)\n\n· 삼각 앞판 폭 약 38cm × 높이 약 26cm\n· 목 둘레: 최대 34cm (스냅 단추 조절)\n· 넉넉한 앞판이 가슴까지 충분히 가려줍니다.\n· 이유식 시기(6개월~)에 특히 유용하며, 외출 시 스카프 아이템으로도 활용됩니다.",
    careInstructions:
      "· 세탁: 30°C 이하 찬물, 중성세제 사용\n· 단독 또는 유사 색상끼리 세탁 권장\n· 손세탁 또는 세탁기 약세탁(울 코스)\n· 건조기 사용 불가 — 수축 및 변형의 원인이 됩니다\n· 그늘에서 자연 건조\n· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다\n· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)",
    features: [
      {
        label: "스카프형 넓은 앞판",
        body: "삼각형으로 재단된 넓은 앞판이 목부터 가슴까지 충분히 가려줍니다. 이유식 시기 옷이 젖는 걱정을 덜어줍니다.",
      },
      {
        label: "6겹 거즈 구조",
        body: "6겹으로 직조된 거즈가 빠른 흡수력과 부드러운 촉감을 동시에 갖춥니다. 세탁할수록 더욱 포근한 질감으로 변합니다.",
      },
      {
        label: "면 100% 국내산",
        body: "화학 첨가물 없이 면 100%로 만들었습니다. 자극에 민감한 신생아 피부에도 안심하고 사용할 수 있습니다.",
      },
      {
        label: "KC 안전 인증",
        body: "어린이제품 공통안전기준(KC 인증)을 완료한 제품입니다. 유해물질 검사를 통과한 소재만을 사용합니다.",
      },
      {
        label: "일상과 외출 모두",
        body: "스카프처럼 자연스러운 실루엣으로 집에서도 외출 시에도 멋스럽게 착용할 수 있습니다.",
      },
    ],
    brandStory:
      "아이와 함께하는 매일의 식사 시간이 조금 더 여유롭기를 바랍니다. Amori의 거즈 스카프 빕은 잘 흡수하고 빨리 마르는 실용성에, 스카프처럼 자연스러운 모양새를 더했습니다. 부모와 아이 모두에게 편안한 하루를 위해.",
    rating: 4.9,
    reviewCount: 0,
    createdAt: "2025-04-01",
  },
  {
    id: "3",
    slug: "spread",
    name: "SPREAD",
    nameKo: "스프레드",
    price: 18000,
    imageUrl: "/products/24.png",
    images: [
      "/products/22.png",
      "/products/29.png",
      "/products/21.png",
      "/products/23.png",
      "/products/28.png",
      "/products/25.png",
      "/products/30.png",
    ],
    colors: [
      { name: "크림", hex: "#EFE4D4" },
      { name: "오트", hex: "#C8B89A" },
    ],
    category: "fabric-goods",
    stock: 50,
    description:
      "국내산 면 100% 6겹 거즈로 만든 다용도 스프레드입니다. 신생아를 감싸는 속싸개부터 낮잠 이불, 수유 케이프, 외출 바람막이까지 — 한 장이 아이와 함께하는 다양한 순간에 맞게 펼쳐집니다. 부드럽고 통기성 좋은 거즈 소재로 사계절 내내 사용할 수 있습니다.",
    material:
      "국내산 면 100% 6겹 거즈\n\n거즈는 성기게 직조된 평직 원단으로, 6겹 구조에서 형성되는 공기층이 온도 조절을 도와 여름에는 시원하고 겨울에는 따뜻합니다. Amori의 스프레드는 세탁을 반복할수록 섬유가 수축되어 더욱 포근하고 촘촘한 질감으로 변합니다.\n\n· 소재: 면(cotton) 100%\n· 원산지: 국내산\n· KC 안전 인증 완료 (어린이제품 공통안전기준)",
    sizeGuide:
      "약 110cm × 110cm\n\n· 신생아 속싸개, 낮잠 이불, 수유 케이프 등 다양하게 활용\n· 신생아부터 36개월까지 사용 가능한 여유로운 크기입니다.\n· 세탁 후 약 5–7% 수축될 수 있습니다.",
    careInstructions:
      "· 세탁: 30°C 이하 찬물, 중성세제 사용\n· 단독 또는 유사 색상끼리 세탁 권장\n· 손세탁 또는 세탁기 약세탁(울 코스)\n· 건조기 사용 불가 — 수축 및 변형의 원인이 됩니다\n· 그늘에서 자연 건조\n· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다\n· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)",
    features: [
      {
        label: "다용도 활용",
        body: "속싸개, 낮잠 이불, 수유 케이프, 외출 바람막이까지 — 한 장이 아이 곁에서 가장 많이 쓰이는 아이템이 됩니다.",
      },
      {
        label: "사계절 소재",
        body: "6겹 거즈의 공기층이 체온 조절을 도와 계절에 관계없이 편안하게 사용할 수 있습니다. 여름엔 시원하게, 겨울엔 포근하게.",
      },
      {
        label: "면 100% 국내산",
        body: "화학 첨가물 없이 면 100%로 만들었습니다. 자극에 민감한 신생아 피부에도 안심하고 사용할 수 있습니다.",
      },
      {
        label: "KC 안전 인증",
        body: "어린이제품 공통안전기준(KC 인증)을 완료한 제품입니다. 유해물질 검사를 통과한 소재만을 사용합니다.",
      },
      {
        label: "세탁할수록 포근해지는",
        body: "반복 세탁으로 섬유가 살짝 수축되며 더 촘촘하고 부드러운 질감으로 변합니다. 오래 쓸수록 손에 익는 소재입니다.",
      },
    ],
    brandStory:
      "아이가 처음 세상 밖 공기를 마주하는 순간부터, Amori의 스프레드가 함께합니다. 감싸고, 덮고, 가리고, 깔고 — 아이 곁에서 가장 많이 쓰이는 한 장이 되기를 바랐습니다. 단순하지만 정직한 소재로, 매일의 육아가 조금 더 가볍기를 바랍니다.",
    rating: undefined,
    reviewCount: 0,
    createdAt: "2025-04-01",
  },
];

export const mockOrders = [
  {
    id: "ord-20250415-001",
    userId: "mock-user",
    items: [
      { productId: "1", productName: "GAUZE BIB", quantity: 2, price: 16000 },
      { productId: "2", productName: "GAUZE SCARF BIB", quantity: 1, price: 13000 },
    ],
    totalAmount: 45000,
    status: "delivered" as const,
    shippingAddress: {
      name: "홍길동",
      phone: "010-1234-5678",
      zipCode: "06234",
      address: "서울 강남구 테헤란로 123",
      addressDetail: "101동 202호",
    },
    createdAt: "2025-04-15T10:30:00Z",
  },
];

export const mockReviews = [
  {
    id: "r1",
    productId: "1",
    userId: "u1",
    userName: "김**",
    rating: 5,
    content: "소재가 정말 부드러워요. 세탁 후에도 보풀 없이 그대로입니다.",
    createdAt: "2025-05-10",
  },
  {
    id: "r2",
    productId: "1",
    userId: "u2",
    userName: "이**",
    rating: 5,
    content: "색감이 사진보다 훨씬 예뻐요. 선물용으로도 딱 좋아요.",
    createdAt: "2025-05-22",
  },
  {
    id: "r3",
    productId: "2",
    userId: "u3",
    userName: "박**",
    rating: 5,
    content: "스카프처럼 예쁘게 둘러줄 수 있어서 좋아요. 거즈라 통기성도 좋고요.",
    createdAt: "2025-06-01",
  },
];
