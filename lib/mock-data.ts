import type { Product, Review } from "./types";

export const mockProducts: Product[] = [
  {
    id: "1",
    slug: "gauze-bib",
    name: "GAUZE BIB",
    nameKo: "거즈 빕",
    description:
      "국내산 면 100% 6겹 거즈로 만든 턱받이입니다. 겹겹이 쌓인 거즈 특유의 입체감이 흡수력과 부드러움을 동시에 갖추고 있어, 먹이고 닦고 받아내는 매일의 순간을 조금 더 편안하게 만들어줍니다. 신생아부터 사용할 수 있는 프리 사이즈로, 넉넉한 크기 덕분에 이유식 시기에도 유용하게 쓰입니다.",
    shortDescription: "포근한 3중 거즈를 양면으로 겹쳐 만든 데일리 턱받이",
    price: 16000,
    // 대표 이미지는 기본 선택 컬러(Cream)의 단독 컷. 컬러 선택 시 colors[].image로 대체됨
    imageUrl: "/products/bib-cream.png",
    // 갤러리 순서: 착용 정면 → 착용 옆면 → 전체 7가지 컬러 → 스냅 디테일 (단독 컷은 imageUrl/colors[].image가 대표 자리에서 담당)
    images: [
      "/products/bib8.png",
      "/products/bib9.png",
      "/products/bib2.png",
      "/products/bib3.png",
    ],
    // TODO: Blush/Royal Blue/Yellow 컬러칩 hex는 실제 원단 색상 대조 후 조정 필요 (근사치로 반영됨)
    colors: [
      { name: "Cream", hex: "#EFE4D4", image: "/products/bib-cream.png" },
      { name: "Mint", hex: "#A8C4B4", image: "/products/bib-mint.png" },
      { name: "Rose Pink", hex: "#E8C9C2", image: "/products/bib-rose-pink.png" },
      { name: "Blush", hex: "#CE9096", image: "/products/bib-blush.png" },
      { name: "Yellow Green", hex: "#CDD678", image: "/products/bib-yellow-green.png" },
      { name: "Royal Blue", hex: "#4A5FA5", image: "/products/bib-royal-blue.png" },
      { name: "Yellow", hex: "#EAD98A", image: "/products/bib-yellow.png" },
    ],
    category: "small-things",
    stock: 80,
    material:
      "국내산 면 100% 6겹 거즈\n\n거즈는 실을 성기게 직조한 평직 원단으로, 겹칠수록 공기층이 생겨 한 장의 두꺼운 천보다 부드럽고 흡수력이 높습니다. Amori의 거즈 빕은 3중 거즈 원단을 두 겹 사용해 총 6겹 구조로 완성되어 침, 분유, 이유식 등을 효과적으로 흡수하며, 세탁을 반복할수록 섬유가 살짝 수축되며 더욱 촘촘하고 포근한 질감으로 변합니다.\n\n· 소재: 면(cotton) 100%\n· 원산지: 국내산\n· KC 안전 인증 완료 (어린이제품 공통안전기준)",
    // TODO: 목둘레 실측 확인 필요 — 확인 후 사이즈표에 추가
    sizeGuide:
      "프리 사이즈 (신생아 ~ 36개월)\n\n· 가로 24cm × 세로 27.5cm\n· 신생아부터 36개월까지, 착용 가능 시기는 아이의 체형에 따라 달라질 수 있으니 구매 전 상세 사이즈를 확인해 주세요.\n· 이유식 시기(6개월~)에는 앞면 전체를 충분히 가려주어 옷이 젖는 것을 막아줍니다.",
    careInstructions:
      "· 세탁: 30°C 이하 찬물, 중성세제 사용\n· 단독 또는 유사 색상끼리 세탁 권장\n· 손세탁 또는 세탁기 약세탁(울 코스)\n· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다\n· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다\n· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)",
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
    storyImage: "/products/bib7.png",
    storyImageAlt: "아모리 거즈빕을 착용한 아이들",
    materialDetailImage: "/products/bib4.png",
    materialDetailImageAlt: "아모리 거즈빕 원단 확대",
    detailImages: [
      { src: "/products/bib7.png", alt: "아모리 거즈빕을 착용한 아이들", width: 1333, height: 2000 },
      { src: "/products/bib8.png", alt: "아모리 거즈빕 아기 착용 정면", width: 1333, height: 2000 },
      { src: "/products/bib9.png", alt: "아모리 거즈빕 아기 착용 옆면", width: 1333, height: 2000 },
      { src: "/products/bib6.png", alt: "아모리 거즈빕 아기 착용 목둘레 디테일", width: 2000, height: 1333 },
      { src: "/products/bib10.png", alt: "아모리 거즈빕 아기 착용 클로즈업", width: 1333, height: 2000 },
      { src: "/products/bib1.png", alt: "아모리 거즈빕 전체 컬러 담긴 바구니", width: 1000, height: 1000 },
      { src: "/products/bib3.png", alt: "아모리 거즈빕 스냅 디테일", width: 1000, height: 1000 },
      { src: "/products/bib2.png", alt: "아모리 거즈빕 컬러 스트랩 디테일", width: 1000, height: 1000 },
      { src: "/products/bib11.png", alt: "아모리 거즈빕 컬러 조합", width: 2000, height: 1333 },
      { src: "/products/bib5.png", alt: "아모리 거즈빕 옷걸이에 걸린 모습", width: 1000, height: 1000 },
    ],
    colorSectionTitle: "7 Colors",
    colorDescription:
      "Cream, Mint, Rose Pink, Blush, Yellow Green, Royal Blue, Yellow — 아이의 옷과 공간에 자연스럽게 어우러지는 7가지 컬러로 준비했습니다.",
    colorSectionImage: "/products/bib1.png",
    colorSectionImageAlt: "아모리 거즈빕 7가지 컬러",
    certificationNumber: "CB014H2463-6001",
    relatedProductSlugs: ["gauze-scarf-bib", "spread"],
    imageAlts: [
      "아모리 거즈빕 아기 착용 정면",
      "아모리 거즈빕 아기 착용 옆면",
      "아모리 거즈빕 7가지 컬러",
      "아모리 거즈빕 스냅 디테일",
    ],
    imageAltSubject: "아기 거즈빕",
    // 실제 후기 확보 전까지 평점 노출 안 함(reviewCount 0이 가드) — 확정된 후기 없어 값 자체도 비워둠
    rating: undefined,
    reviewCount: 0,
    createdAt: "2025-04-01",
  },
  {
    id: "2",
    slug: "gauze-scarf-bib",
    name: "GAUZE SCARF BIB",
    nameKo: "거즈 스카프 빕",
    price: 13000,
    imageUrl: "/products/scarf-cream.png",
    images: [
      "/products/scarf1.png",
      "/products/scarf2.png",
      "/products/scarf3.png",
      "/products/scarf4.png",
    ],
    // 컬러칩 hex는 GAUZE BIB와 동일 값으로 통일 (동일 원단 기준). 실물 대조 후 조정 필요 여부는 GAUZE BIB TODO와 동일 사안
    colors: [
      { name: "옐로우그린", hex: "#CDD678", image: "/products/scarf-yellowgreen.png" },
      { name: "민트", hex: "#A8C4B4", image: "/products/scarf-mint.png" },
      { name: "로즈핑크", hex: "#E8C9C2", image: "/products/scarf-rosepink.png" },
      { name: "크림", hex: "#EFE4D4", image: "/products/scarf-cream.png" },
      { name: "블러쉬", hex: "#CE9096", image: "/products/scarf-blush.png" },
      { name: "로열 블루", hex: "#4A5FA5", image: "/products/scarf-royalblue.png" },
      { name: "옐로우", hex: "#EAD98A", image: "/products/scarf-yellow.png" },
    ],
    category: "small-things",
    stock: 80,
    description:
      "국내산 면 100% 6겹 거즈로 만든 스카프형 턱받이입니다. 삼각형으로 재단된 넓은 앞판이 목부터 가슴까지 충분히 감싸주어, 이유식이나 수유 중 옷이 젖는 것을 효과적으로 막아줍니다. 스카프처럼 자연스럽게 연출되어 집에서도 외출 시에도 편안하게 착용할 수 있습니다.",
    shortDescription: "턱받이처럼 실용적이고 스카프처럼 자연스럽게",
    material:
      "국내산 면 100% 6겹 거즈\n\n거즈 특유의 성긴 직조 방식이 겹칠수록 공기층을 형성해 부드럽고 흡수력이 뛰어납니다. Amori의 거즈 스카프 빕은 6겹 구조로 직조되어 침과 음식물을 빠르게 흡수하며, 세탁을 반복할수록 섬유가 수축되어 더욱 촘촘하고 포근한 질감으로 변합니다.\n\n· 소재: 면(cotton) 100%\n· 원산지: 국내산\n· KC 안전 인증 완료 (어린이제품 공통안전기준)",
    sizeGuide:
      "프리 사이즈 (신생아 ~ 36개월)\n\n· 삼각 앞판 폭 약 37cm × 길이 약 11cm\n· 스냅 단추로 간편하게 착용할 수 있습니다.\n· 간절기 아기의 목을 보호해주며, 외출 시 스카프 아이템으로도 활용됩니다.",
    careInstructions:
      "· 세탁: 30°C 이하 찬물, 중성세제 사용\n· 단독 또는 유사 색상끼리 세탁 권장\n· 손세탁 또는 세탁기 약세탁(울 코스)\n· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다\n· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다\n· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)",
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
      "아이와 함께하는 매일의 식사 시간이 조금 더 여유롭기를 바랍니다. Amori의 거즈 스카프 빕은 잘 흡수하고 빨리 마르는 실용성에, 스카프처럼 자연스러운 모양새를 더했습니다. 부모와 아이 모두에게 편안한 하루를 위해.",
    storyImage: "/products/scarf7.png",
    storyImageAlt: "아모리 거즈 스카프 빕과 함께하는 아이들의 일상",
    materialDetailImage: "/products/scarf10.png",
    materialDetailImageAlt: "아모리 거즈 스카프 빕 원단 확대",
    // scarf5~9는 public/products에 있던 미사용 사진을 실제로 확인한 뒤 용도별로 배치함
    detailImages: [
      { src: "/products/scarf5.png", alt: "아모리 거즈 스카프 빕을 착용한 아기", width: 1333, height: 2000 },
      { src: "/products/scarf6.png", alt: "아모리 거즈 스카프 빕을 착용하고 웃는 아기", width: 1333, height: 2000 },
      { src: "/products/scarf8.png", alt: "아모리 거즈 스카프 빕 착용 클로즈업", width: 1333, height: 2000 },
      { src: "/products/scarf9.png", alt: "아모리 거즈 스카프 빕 여러 컬러 플랫레이", width: 2000, height: 1333 },
      { src: "/products/scarf1.png", alt: "아모리 거즈 스카프 빕 여러 컬러 행잉 연출", width: 1000, height: 1000 },
    ],
    colorSectionTitle: "7 Colors",
    colorDescription:
      "옐로우그린, 민트, 로즈핑크, 크림, 블러쉬, 로열 블루, 옐로우 — 아이의 옷과 공간에 자연스럽게 어우러지는 7가지 컬러로 준비했습니다.",
    colorSectionImage: "/products/scarf9.png",
    colorSectionImageAlt: "아모리 거즈 스카프 빕 여러 컬러",
    certificationNumber: "CB014H2463-6001",
    relatedProductSlugs: ["gauze-bib", "spread"],
    imageAlts: [
      "아모리 거즈 스카프 빕 여러 컬러 행잉 연출",
      "아모리 거즈 스카프 빕 여러 컬러 플랫레이",
      "아모리 거즈 스카프 빕 겹쳐진 원단 디테일",
      "아모리 거즈 스카프 빕 컬러 겹침 클로즈업",
    ],
    imageAltSubject: "아기 거즈 스카프 빕",
    // 실제 후기 확보 전까지 평점 노출 안 함(reviewCount 0이 가드) — 확정된 후기 없어 값 자체도 비워둠
    rating: undefined,
    reviewCount: 0,
    createdAt: "2025-04-01",
  },
  {
    id: "3",
    slug: "spread",
    name: "SPREAD",
    nameKo: "스프레드",
    price: 18000,
    // 대표 이미지는 제품 전체 형태가 가장 잘 보이는 컷으로 지정 (기존 spread1.png는 인물 클로즈업이라 Details로 이동)
    imageUrl: "/products/spread7.png",
    images: [
      "/products/spread4.png",
      "/products/spread3.png",
      "/products/spread6.png",
      "/products/spread2.png",
      "/products/spread5.png",
      "/products/spread8.png",
    ],
    colors: [
      { name: "크림", hex: "#EFE4D4", image: "/products/spread-cream.png" },
      { name: "오트", hex: "#C8B89A", image: "/products/spread-oat.png" },
    ],
    category: "fabric-goods",
    stock: 50,
    description:
      "국내산 면 100% 6겹 거즈로 만든 다용도 스프레드입니다. 신생아를 감싸는 속싸개부터 낮잠 이불, 수유 케이프, 외출 바람막이까지 — 한 장이 아이와 함께하는 다양한 순간에 맞게 펼쳐집니다. 부드럽고 통기성 좋은 거즈 소재로 사계절 내내 사용할 수 있습니다.",
    shortDescription: "아이의 다양한 순간에 함께하는 거즈 스프레드",
    material:
      "국내산 면 100% 6겹 거즈\n\n거즈는 성기게 직조된 평직 원단으로, 6겹 구조에서 형성되는 공기층이 온도 조절을 도와 여름에는 시원하고 겨울에는 따뜻합니다. Amori의 스프레드는 세탁을 반복할수록 섬유가 수축되어 더욱 포근하고 촘촘한 질감으로 변합니다.\n\n· 소재: 면(cotton) 100%\n· 원산지: 국내산\n· KC 안전 인증 완료 (어린이제품 공통안전기준)",
    // 사이즈 미확정 — SIZE 아코디언은 노출하되 내용은 비워둠. 확정되면 값 채우기
    sizeGuide: "",
    careInstructions:
      "· 세탁: 30°C 이하 찬물, 중성세제 사용\n· 단독 또는 유사 색상끼리 세탁 권장\n· 손세탁 또는 세탁기 약세탁(울 코스)\n· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다\n· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다\n· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)",
    features: [
      {
        label: "포근한 6겹 거즈",
        body: "국내산 면 100% 3중 거즈 원단을 두 겹으로 사용해 부드러우면서도 충분한 흡수력을 갖췄습니다.",
      },
      {
        label: "KC 안전기준 확인",
        body: "아기 피부에 직접 닿는 제품인 만큼 어린이제품 안전기준에 따른 시험을 완료했습니다. (인증번호: CB014H2463-6001)",
      },
      {
        label: "다용도 활용",
        body: "아기를 안을 때, 어깨나 팔에 걸쳐 아기들의 피부를 보호하고. 터미타임 때, 가슴 밑에 깔아주셔도 좋아요. 아기가 많이 크고 나서는 주방 테이블 매트, 먼지가 쉽게 쌓이는 가전들 위에 덮개로도 쓸 수 있답니다.",
      },
    ],
    brandStory:
      "아이가 처음 세상 밖 공기를 마주하는 순간부터, Amori의 스프레드가 함께합니다. 예민한 아기의 피부가 닿는 모든 곳에 보드라운 스프레드를 깔고 사용해주세요.",
    storyImage: "/products/spread6.png",
    storyImageAlt: "아모리 스프레드를 접어둔 따뜻한 집안 풍경",
    materialDetailImage: "/products/spread5.png",
    materialDetailImageAlt: "아모리 스프레드 원단 확대",
    // spread9~11은 public/products에 있던 미사용 사진을 실제로 확인한 뒤 용도별로 배치함.
    // spread1(이전 대표 이미지)은 인물 클로즈업이라 대표 이미지에서는 제외했지만 삭제하지 않고 Details 라이프스타일 컷으로 유지
    detailImages: [
      { src: "/products/spread9.png", alt: "아모리 스프레드 전체 형태", width: 1333, height: 2000 },
      { src: "/products/spread10.png", alt: "아모리 스프레드가 놓인 집안 풍경", width: 1333, height: 2000 },
      { src: "/products/spread11.png", alt: "아모리 스프레드와 함께 있는 아이", width: 2000, height: 1333 },
      { src: "/products/spread1.png", alt: "아모리 스프레드와 함께하는 아이의 일상", width: 2000, height: 1333 },
    ],
    colorSectionTitle: "2 Colors",
    colorDescription:
      "Cream, Oat — 아이의 공간 어디에나 자연스럽게 어우러지는 2가지 컬러로 준비했습니다.",
    colorSectionImage: "/products/spread8.png",
    colorSectionImageAlt: "아모리 스프레드 크림·오트 컬러",
    certificationNumber: "CB014H2463-6001",
    // 스냅 없는 제품 — hardwareInfo 미설정 (UI에 부자재 섹션 자체가 노출되지 않음)
    relatedProductSlugs: ["gauze-bib", "gauze-scarf-bib"],
    imageAlts: [
      "아모리 스프레드 원단 디테일과 사과 오브제",
      "아모리 스프레드 크림·오트 컬러 겹친 모습",
      "아모리 스프레드 크림·오트 컬러 라운드 테이블 연출",
      "아모리 스프레드 보관된 모습",
      "아모리 스프레드 원단 확대",
      "아모리 스프레드 크림·오트 컬러 소개",
    ],
    imageAltSubject: "거즈 스프레드",
    rating: undefined,
    reviewCount: 0,
    createdAt: "2025-04-01",
  },
  {
    id: "4",
    slug: "flower-pouch",
    name: "FLOWER POUCH",
    nameKo: "플라워 파우치",
    price: 8000,
    // 사이즈별로 가격이 달라 sizes[]가 실제 판매가를 결정 (price는 최저가 표시용 기본값)
    sizes: [
      { name: "S", price: 8000 },
      { name: "L", price: 13000 },
    ],
    // 단독 촬영 컷이 없어 기존 미니 파우치와 신규 라지 사이즈가 함께 담긴 사진을 대표 이미지로 사용
    // (기존 증정용 미니 파우치와는 다른 상품 — 겉감 거즈 + 안감 옥스퍼드의 대형 플라워 파우치)
    imageUrl: "/products/flower-pouch1.png",
    images: [
      "/products/flower-pouch9.png",
      "/products/flower-pouch4.png",
      "/products/flower-pouch11.png",
    ],
    // 컬러별 단독 컷이 없어 colors[].image는 비워둠 (컬러칩 hover 시 이미지가 바뀌지 않음)
    // TODO: Pink/Blue 컬러칩 hex는 사진 기준 근사치 — 실물 대조 후 조정 필요
    colors: [
      { name: "Pink", hex: "#D9AFAE" },
      { name: "Blue", hex: "#A9BBCE" },
    ],
    category: "small-things",
    stock: 50,
    description:
      "아기와의 외출에 필요한 것들을 사랑스럽게 담아주는 플라워 파우치입니다. 기저귀, 물티슈, 손수건까지 넉넉하게 수납할 수 있는 큰 사이즈로, 가로로 긴 형태라 물건을 넣고 꺼내기 편합니다. 겉감은 부드러운 거즈로, 안감에는 옥스퍼드 원단을 덧대어 적당히 도톰하고 안정적인 형태를 유지합니다. 아이가 자란 뒤에도 여행용, 다용도 파우치로 오래 활용할 수 있습니다.",
    shortDescription: "아기와의 외출을 사랑스럽게 담는 플라워 파우치",
    material:
      "겉감: 거즈(면)\n안감: 옥스퍼드 원단\n\n겉면은 부드러운 거즈로, 안감에는 옥스퍼드 원단을 덧대어 적당히 도톰하고 안정적인 형태를 유지합니다.",
    // 정확한 사이즈 미확정 — SIZE는 위 사이즈 선택 버튼(S/L)으로 대체, 별도 사이즈 아코디언은 노출하지 않음
    careInstructions:
      "· 세탁: 30°C 이하 찬물, 중성세제 사용\n· 단독 또는 유사 색상끼리 세탁 권장\n· 손세탁 또는 세탁기 약세탁(울 코스)\n· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다\n· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다\n· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)",
    detailIntro:
      "아기와 외출할 때는 챙길 것들이 참 많습니다. 기저귀, 물티슈, 손수건까지 — 여러 개의 작은 물건을 한곳에 정리해서 담을 수 있는 파우치를 만들고 싶었어요.\n\n큰 블랭킷도 들어가는 넉넉한 크기에 가로로 긴 형태를 더해 물건을 넣고 꺼내기 편하게 만들었습니다. 겉감 거즈에 옥스퍼드 안감을 덧대어 적당히 도톰하게 완성해 내용물이 적어도 쉽게 흐물거리지 않습니다. 아이가 자란 뒤에도 여행용, 다용도 파우치로 오래 곁에 둘 수 있는 아이템입니다.",
    features: [
      {
        label: "넉넉한 수납",
        body: "큰 블랭킷도 들어가는 넉넉한 크기로, 기저귀와 물티슈, 손수건 같은 외출용품을 한 번에 담을 수 있습니다.",
      },
      {
        label: "편리한 가로형 디자인",
        body: "가로 폭이 넉넉한 형태로 만들어 물건을 넣고 꺼내기 편합니다.",
      },
      {
        label: "도톰하고 안정적인 형태",
        body: "겉감 거즈에 옥스퍼드 안감을 덧대어 내용물이 적어도 쉽게 흐물거리지 않습니다.",
      },
      {
        label: "오래 활용하는 다용도 파우치",
        body: "아이가 자란 뒤에도 여행용, 다용도 파우치로 오래 활용할 수 있습니다.",
      },
    ],
    brandStory:
      "아모리의 미니 파우치는 처음엔 작은 증정품으로 시작했습니다. 아기를 위한 작은 물건들을 담아드리고 싶은 마음으로 만들었던 그 파우치가, 이제는 기저귀와 물티슈까지 넉넉하게 담을 수 있는 더 큰 사이즈의 플라워 파우치로 자라났습니다. 작은 것에서 시작해 실용적인 곁으로 — 아모리의 파우치는 그렇게 함께 커가고 있습니다.",
    storyImage: "/products/flower-pouch3.jpg",
    storyImageAlt: "아모리 플라워 파우치가 놓인 침실 풍경",
    materialDetailImage: "/products/flower-pouch6.png",
    materialDetailImageAlt: "아모리 플라워 파우치가 놓인 주방 풍경",
    detailImages: [
      { src: "/products/flower-pouch2.png", alt: "아모리 플라워 파우치 침실 연출", width: 2000, height: 3000 },
      { src: "/products/flower-pouch7.png", alt: "아모리 플라워 파우치 주방 연출", width: 2000, height: 3000 },
      { src: "/products/flower-pouch10.png", alt: "아모리 플라워 파우치 창가 연출", width: 2000, height: 1333 },
    ],
    colorSectionTitle: "2 Colors",
    colorDescription: "Pink, Blue — 아이의 외출용품에 자연스럽게 어우러지는 2가지 컬러로 준비했습니다.",
    colorSectionImage: "/products/flower-pouch1.png",
    colorSectionImageAlt: "아모리 플라워 파우치 블루·핑크 컬러",
    // KC 인증 대상 아님 — certificationNumber 미설정 (SAFETY CERTIFICATION 미노출)
    relatedProductSlugs: ["hand-towel", "spread"],
    imageAlts: [
      "아모리 플라워 파우치 단독 사진",
      "아모리 플라워 파우치 라벨과 끈 디테일",
      "아모리 플라워 파우치 원단 패턴 클로즈업",
    ],
    imageAltSubject: "플라워 파우치",
    rating: undefined,
    reviewCount: 0,
    createdAt: "2026-07-20",
  },
  {
    id: "5",
    slug: "hand-towel",
    name: "HAND TOWEL",
    nameKo: "핸드타월",
    price: 9000,
    imageUrl: "/products/hand-tower-babypink.png",
    images: [
      "/products/hand-tower1.png",
      "/products/hand-tower4.png",
      "/products/hand-tower12.png",
      "/products/hand-tower18.png",
    ],
    // 컬러명은 실제 촬영 환경(조명)에 따라 사진상 색감 차이가 있어 파일명 기준으로 확정
    // TODO: 컬러칩 hex는 색상명 기준 근사치 — 실물 대조 후 조정 필요
    colors: [
      { name: "Baby Pink", hex: "#F3B6C4", image: "/products/hand-tower-babypink.png" },
      { name: "Green Apple", hex: "#B7C97A", image: "/products/hand-tower-greenapple.png" },
      { name: "Lavender", hex: "#B9A0C9", image: "/products/hand-tower-larvendar.png" },
      { name: "Sky", hex: "#AFCBE0", image: "/products/hand-tower-sky.png" },
    ],
    category: "small-things",
    stock: 50,
    description:
      "작은 손과 얼굴에 매일 닿는 부드러운 거즈 핸드타월입니다. 3중 거즈 원단을 양면으로 덧대 총 6겹으로 완성해 가볍고 흡수가 빠르며, 헤링본 끈으로 만든 고리가 있어 걸어두고 사용하기 편합니다. 집에서도 어린이집에서도 부담 없이 매일 쓸 수 있습니다.",
    shortDescription: "작은 손과 얼굴에 매일 닿는 부드러운 거즈 핸드타월",
    material:
      "면 100% 거즈\n\n3중 거즈 원단을 양면으로 덧대어 총 6겹으로 완성했습니다.",
    // 정확한 사이즈 미확정 — SIZE 아코디언은 노출하되 내용은 비워둠
    sizeGuide: "",
    careInstructions:
      "· 세탁: 30°C 이하 찬물, 중성세제 사용\n· 단독 또는 유사 색상끼리 세탁 권장\n· 손세탁 또는 세탁기 약세탁(울 코스)\n· 건조기 사용 자제 — 수축 및 변형의 원인이 될 수 있습니다\n· 직사광선 장시간 노출 시 색상이 바랄 수 있습니다\n· 처음 세탁 시 단독으로 세탁해 주세요 (이염 방지)",
    detailIntro:
      "아기 얼굴과 손, 엉덩이까지 부담 없이 닦을 수 있는 크기로 만들었습니다. 너무 작지도 크지도 않은 사이즈에, 얇지도 두껍지도 않은 적당한 두께를 더했습니다.\n\n가볍고 부드러운 거즈 원단이라 빠르게 흡수되고, 헤링본 끈으로 만든 고리가 있어 집에서도 어린이집에서도 편하게 걸어두고 사용할 수 있습니다.",
    features: [
      {
        label: "부드러운 거즈 원단",
        body: "3중 거즈를 양면으로 덧대 총 6겹으로 완성해 부드러우면서도 도톰합니다.",
      },
      {
        label: "가볍고 빠른 흡수",
        body: "가벼운 거즈 소재로 빠르게 물기를 흡수합니다.",
      },
      {
        label: "부담스럽지 않은 크기",
        body: "휴대하기 부담스럽지 않은 크기로, 아기 얼굴과 손을 닦기에 알맞습니다.",
      },
      {
        label: "고리형 디자인",
        body: "헤링본 끈으로 만든 고리가 있어 집과 어린이집 어디서나 걸어두고 사용할 수 있습니다.",
      },
    ],
    brandStory:
      "아모리는 거즈 소재를 중심으로 아기를 위한 패브릭을 만들어왔습니다. 그 부드러운 소재로 매일 곁에 두고 쓸 수 있는 것을 고민하다, 아기 얼굴과 손을 닦아주는 작은 핸드타월을 만들게 되었습니다. 매일 아기 피부에 닿는 것이니만큼, 부드럽고 가벼운 거즈 그대로의 촉감을 담았습니다.",
    storyImage: "/products/hand-tower3.png",
    storyImageAlt: "아모리 핸드타월이 창가 고리에 걸린 모습",
    materialDetailImage: "/products/hand-tower10.png",
    materialDetailImageAlt: "아모리 핸드타월 거즈 원단 확대",
    detailImages: [
      { src: "/products/hand-tower7.png", alt: "아모리 핸드타월 고리 디테일", width: 2000, height: 1333 },
      { src: "/products/hand-tower9.png", alt: "아모리 핸드타월 여러 컬러 원단 클로즈업", width: 2000, height: 1333 },
      { src: "/products/hand-tower6.png", alt: "아모리 핸드타월 주방 바구니 연출", width: 1734, height: 1156 },
      { src: "/products/hand-tower13.png", alt: "아모리 핸드타월 창가에 쌓인 모습", width: 2000, height: 3000 },
      { src: "/products/hand-tower11.png", alt: "아모리 핸드타월 여러 컬러 쌓인 모습", width: 2000, height: 1333 },
    ],
    colorSectionTitle: "4 Colors",
    colorDescription:
      "Baby Pink, Green Apple, Lavender, Sky — 아이의 공간 어디에나 자연스럽게 어우러지는 4가지 컬러로 준비했습니다.",
    colorSectionImage: "/products/hand-tower18.png",
    colorSectionImageAlt: "아모리 핸드타월 여러 컬러 고리 연출",
    certificationNumber: "CB014H2463-6001",
    relatedProductSlugs: ["spread", "gauze-bib", "gauze-scarf-bib"],
    imageAlts: [
      "아모리 핸드타월 두 컬러 고리 연출",
      "아모리 핸드타월 네 컬러 플랫레이",
      "아모리 핸드타월 창가에 놓인 모습",
      "아모리 핸드타월 여러 컬러 고리 연출",
    ],
    imageAltSubject: "핸드타월",
    rating: undefined,
    reviewCount: 0,
    createdAt: "2026-07-20",
  },
];

// 상품 카드(SHOP, 홈페이지, 추천상품) 기본 썸네일 — 컬러칩 hover 전 여러 컬러가 함께 보이는 컷.
// 컬러칩에 hover하면 해당 컬러 이미지로 바뀌고, hover가 끝나면 이 기본 이미지로 되돌아감
export const CARD_DEFAULT_IMAGE: Record<string, string> = {
  "gauze-bib": "/products/bib2.png",
  "gauze-scarf-bib": "/products/scarf2.png",
  spread: "/products/spread3.png",
  "flower-pouch": "/products/flower-pouch1.png",
  "hand-towel": "/products/hand-tower4.png",
};

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

// 실제 고객 리뷰가 아직 없어 전부 비워둠 — 실제 구매 리뷰가 쌓이면 여기에 추가
export const mockReviews: Review[] = [];
