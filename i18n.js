/* One row per message: key, English, 简体中文, Français, Deutsch, 한국어.
   Keep all five cells filled when editing copy; scripts/check-locales.mjs enforces this. */
const SOCIAL_I18N_ROWS = [
  ["meta.title", "SocialReasoner — Human reasoning, in context", "SocialReasoner — 在情境中理解人的推理", "SocialReasoner — Le raisonnement humain en contexte", "SocialReasoner — Menschliches Denken im Kontext", "SocialReasoner — 맥락 속 인간의 추론"],
  ["meta.description", "SocialReasoner explores a foundation model of human social reasoning distilled from heterogeneous experts. Research preview; open release coming soon.", "SocialReasoner 探索从多类型专家模型中蒸馏人类社会推理基础模型。研究预览；开放资源即将发布。", "SocialReasoner explore un modèle de fondation du raisonnement social humain distillé à partir d’experts hétérogènes. Aperçu de recherche ; publication ouverte à venir.", "SocialReasoner erforscht ein Grundlagenmodell menschlichen sozialen Schlussfolgerns, destilliert aus unterschiedlichen Expertenmodellen. Forschungsvorschau; offene Veröffentlichung folgt.", "SocialReasoner는 서로 다른 전문가 모델에서 증류한 인간 사회적 추론의 파운데이션 모델을 탐구합니다. 연구 미리보기이며 공개 자료는 곧 제공됩니다."],
  ["meta.ogDescription", "Learning a foundation model of human social reasoning from heterogeneous experts. Research preview.", "从多类型专家模型中学习人类社会推理基础模型。研究预览。", "Apprendre un modèle de fondation du raisonnement social humain à partir d’experts hétérogènes. Aperçu de recherche.", "Ein Grundlagenmodell menschlichen sozialen Schlussfolgerns aus unterschiedlichen Expertenmodellen lernen. Forschungsvorschau.", "서로 다른 전문가 모델에서 인간 사회적 추론의 파운데이션 모델을 학습합니다. 연구 미리보기."],
  ["nav.skip", "Skip to content", "跳转到正文", "Aller au contenu", "Zum Inhalt springen", "본문으로 건너뛰기"],
  ["nav.brandAria", "SocialReasoner, back to top", "SocialReasoner，返回顶部", "SocialReasoner, revenir en haut", "SocialReasoner, zurück nach oben", "SocialReasoner, 맨 위로"],
  ["nav.primaryAria", "Primary", "主导航", "Navigation principale", "Hauptnavigation", "기본 탐색"],
  ["nav.mobileAria", "Mobile primary", "移动端主导航", "Navigation mobile principale", "Mobile Hauptnavigation", "모바일 기본 탐색"],
  ["nav.languageAria", "Choose site language", "选择网站语言", "Choisir la langue du site", "Sprache der Website wählen", "사이트 언어 선택"],
  ["nav.idea", "The idea", "核心理念", "L’idée", "Die Idee", "핵심 아이디어"],
  ["nav.approach", "Approach", "研究方法", "Méthode", "Methode", "연구 방법"],
  ["nav.evidence", "Evidence", "研究证据", "Résultats", "Ergebnisse", "연구 결과"],
  ["nav.coverage", "Coverage", "地区覆盖", "Couverture", "Abdeckung", "지역 범위"],
  ["nav.release", "Release", "开放资源", "Publication", "Veröffentlichung", "공개 자료"],
  ["nav.resources", "Explore resources", "查看资源", "Explorer les ressources", "Ressourcen ansehen", "자료 살펴보기"],
  ["nav.resourcesShort", "Resources ↗", "资源 ↗", "Ressources ↗", "Ressourcen ↗", "자료 ↗"],
  ["nav.openMenu", "Open menu", "打开菜单", "Ouvrir le menu", "Menü öffnen", "메뉴 열기"],
  ["nav.closeMenu", "Close menu", "关闭菜单", "Fermer le menu", "Menü schließen", "메뉴 닫기"],
  ["hero.preview", "RESEARCH PREVIEW", "研究预览", "APERÇU DE RECHERCHE", "FORSCHUNGSVORSCHAU", "연구 미리보기"],
  ["hero.releaseSoon", "OPEN RELEASE COMING SOON", "开放资源即将发布", "PUBLICATION OUVERTE À VENIR", "OFFENE VERÖFFENTLICHUNG FOLGT", "공개 자료 곧 제공"],
  ["paper.title", "Learning a Foundation Model of Human Social Reasoning from Heterogeneous Experts", "从多类型专家模型中学习人类社会推理基础模型", "Apprendre un modèle de fondation du raisonnement social humain à partir d’experts hétérogènes", "Ein Grundlagenmodell menschlichen sozialen Schlussfolgerns aus unterschiedlichen Expertenmodellen lernen", "서로 다른 전문가 모델에서 인간 사회적 추론의 파운데이션 모델 학습"],
  ["hero.description", "People rarely make choices from demographics alone. SocialReasoner brings together diverse predictive perspectives to model how context, perceptions, and choices connect.", "人的选择很少只由人口统计特征决定。SocialReasoner 汇集多种预测视角，刻画情境、感知与选择之间的联系。", "Les choix humains ne découlent presque jamais de la seule démographie. SocialReasoner réunit plusieurs perspectives prédictives pour modéliser les liens entre contexte, perceptions et choix.", "Menschen treffen Entscheidungen selten allein aufgrund demografischer Merkmale. SocialReasoner verbindet verschiedene Vorhersageperspektiven, um Kontext, Wahrnehmungen und Entscheidungen gemeinsam zu modellieren.", "사람의 선택은 인구통계 정보만으로 설명되기 어렵습니다. SocialReasoner는 다양한 예측 관점을 모아 맥락, 인식, 선택의 연결을 모델링합니다."],
  ["hero.exploreMethod", "Explore the method", "了解方法", "Explorer la méthode", "Methode erkunden", "방법 살펴보기"],
  ["hero.seeEvidence", "See the evidence", "查看结果", "Voir les résultats", "Ergebnisse ansehen", "결과 보기"],
  ["resource.data", "Data", "数据", "Données", "Daten", "데이터"],
  ["resource.code", "Code", "代码", "Code", "Code", "코드"],
  ["resource.model", "Model", "模型", "Modèle", "Modell", "모델"],
  ["resource.hfSoon", "Hugging Face · Coming soon", "Hugging Face · 即将开放", "Hugging Face · Bientôt disponible", "Hugging Face · Demnächst", "Hugging Face · 공개 예정"],
  ["resource.githubSoon", "GitHub · Coming soon", "GitHub · 即将开放", "GitHub · Bientôt disponible", "GitHub · Demnächst", "GitHub · 공개 예정"],
  ["resource.upcomingAria", "Upcoming resources", "即将开放的资源", "Ressources à venir", "Künftige Ressourcen", "공개 예정 자료"],
  ["resource.releaseAria", "Release status", "资源发布状态", "Statut de publication", "Veröffentlichungsstatus", "자료 공개 현황"],
  ["resource.comingSoon", "Coming soon", "即将开放", "Bientôt disponible", "Demnächst", "공개 예정"],
  ["resource.open", "Open resource ↗", "打开资源 ↗", "Ouvrir la ressource ↗", "Ressource öffnen ↗", "자료 열기 ↗"],
  ["hero.globeAria", "Interactive globe showing respondent counts by survey region", "按调查地区显示受访者数量的交互式地球", "Globe interactif indiquant le nombre de répondants par région d’enquête", "Interaktiver Globus mit Befragtenzahlen nach Erhebungsregion", "조사 지역별 응답자 수를 보여 주는 대화형 지구본"],
  ["hero.canvasAria", "Drag to rotate the world globe. Select a dataset or region using the controls below for keyboard access.", "拖动地球进行旋转。使用下方控件可通过键盘选择数据集或地区。", "Faites glisser le globe pour le faire tourner. Utilisez les commandes ci-dessous pour choisir un jeu de données ou une région au clavier.", "Ziehen Sie den Globus zum Drehen. Mit den Steuerelementen unten können Sie Datensatz oder Region per Tastatur wählen.", "지구본을 드래그해 회전하세요. 키보드로는 아래 조작 도구에서 데이터셋이나 지역을 선택하세요."],
  ["hero.geoCoverage", "GEOGRAPHIC COVERAGE", "地理覆盖", "COUVERTURE GÉOGRAPHIQUE", "GEOGRAFISCHE ABDECKUNG", "지리적 범위"],
  ["hero.surveyData", "SURVEY DATA", "调查数据", "DONNÉES D’ENQUÊTE", "UMFRAGEDATEN", "설문 데이터"],
  ["hero.exploreDataset", "EXPLORE DATASET", "探索数据集", "EXPLORER UN JEU DE DONNÉES", "DATENSATZ ERKUNDEN", "데이터셋 살펴보기"],
  ["hero.filterAria", "Filter globe by dataset", "按数据集筛选地球", "Filtrer le globe par jeu de données", "Globus nach Datensatz filtern", "데이터셋으로 지구본 필터링"],
  ["hero.loadingCoverage", "Loading coverage…", "正在加载地区数据…", "Chargement de la couverture…", "Abdeckung wird geladen…", "지역 데이터 불러오는 중…"],
  ["hero.worldwide", "WORLDWIDE / ALL DATASETS", "全球 / 所有数据集", "MONDE / TOUS LES JEUX DE DONNÉES", "WELTWEIT / ALLE DATENSÄTZE", "전 세계 / 모든 데이터셋"],
  ["hero.loading", "Loading coverage", "正在加载地区数据", "Chargement de la couverture", "Abdeckung wird geladen", "지역 데이터 불러오는 중"],
  ["hero.pleaseWait", "Please wait", "请稍候", "Veuillez patienter", "Bitte warten", "잠시만 기다려 주세요"],
  ["hero.pauseAria", "Pause globe rotation", "暂停地球旋转", "Mettre en pause la rotation du globe", "Globusrotation pausieren", "지구본 회전 일시정지"],
  ["hero.resetAria", "Reset globe view", "重置地球视图", "Réinitialiser la vue du globe", "Globusansicht zurücksetzen", "지구본 보기 초기화"],
  ["hero.pause", "PAUSE", "暂停", "PAUSE", "PAUSE", "일시정지"],
  ["hero.reset", "RESET", "重置", "RÉINITIALISER", "ZURÜCKSETZEN", "초기화"],
  ["hero.centroids", "SURVEY REGION CENTERS INDICATE COVERAGE", "地区中心点仅表示覆盖范围", "LES CENTRES DES RÉGIONS INDIQUENT LA COUVERTURE", "REGIONSMITTELPUNKTE ZEIGEN DIE ABDECKUNG", "지역 중심점은 범위만 표시"],
  ["hero.drag", "DRAG TO EXPLORE", "拖动探索", "FAIRE GLISSER POUR EXPLORER", "ZIEHEN ZUM ERKUNDEN", "드래그해 살펴보기"],
  ["hero.scroll", "SCROLL TO EXPLORE", "向下探索", "FAIRE DÉFILER POUR EXPLORER", "SCROLLEN ZUM ERKUNDEN", "스크롤해 살펴보기"],
  ["stats.aria", "Study scale", "研究规模", "Ampleur de l’étude", "Umfang der Studie", "연구 규모"],
  ["stats.datasets", "datasets", "个数据集", "jeux de données", "Datensätze", "개 데이터셋"],
  ["stats.respondents", "respondents · manuscript", "名受访者 · 论文统计", "répondants · manuscrit", "Befragte · Manuskript", "명 응답자 · 논문 기준"],
  ["stats.responses", "responses", "条回答", "réponses", "Antworten", "개 응답"],
  ["stats.questions", "questions", "个问题", "questions", "Fragen", "개 문항"],
  ["stats.areas", "thematic areas", "个主题领域", "domaines thématiques", "Themenbereiche", "개 주제 영역"],
  ["idea.number", "THE QUESTION", "研究问题", "LA QUESTION", "DIE FRAGE", "연구 질문"],
  ["idea.kicker", "BEYOND A PROFILE", "超越人物画像", "AU-DELÀ D’UN PROFIL", "MEHR ALS EIN PROFIL", "프로필 그 너머"],
  ["idea.heading1", "To understand a choice,", "要理解一个选择，", "Pour comprendre un choix,", "Um eine Entscheidung zu verstehen,", "선택을 이해하려면,"],
  ["idea.heading2", "see the world around it.", "先看它所处的世界。", "regardez le monde qui l’entoure.", "betrachte die Welt darum herum.", "그 주변의 세계를 보세요."],
  ["idea.lede", "Social decisions emerge from more than who someone is. What they believe, perceive, and experience can change the meaning of the same question.", "社会性选择不只取决于一个人是谁。同样的问题，在不同的信念、感知和经历中可能具有不同意义。", "Les décisions sociales dépendent de bien plus que de l’identité d’une personne. Ses croyances, ses perceptions et son vécu peuvent changer le sens d’une même question.", "Soziale Entscheidungen hängen von mehr ab als davon, wer jemand ist. Überzeugungen, Wahrnehmungen und Erfahrungen können derselben Frage eine andere Bedeutung geben.", "사회적 선택은 한 사람이 누구인지 이상의 요소에서 비롯됩니다. 믿음, 인식, 경험에 따라 같은 질문의 의미도 달라질 수 있습니다."],
  ["idea.body", "The research asks whether a single language model can learn useful reasoning patterns from heterogeneous experts: interpretable additive models, tree ensembles, and neural networks.", "本研究探讨：一个语言模型能否从可解释的加性模型、树集成和神经网络等不同专家模型中学习有用的推理模式？", "Cette recherche examine si un même modèle de langage peut apprendre des schémas de raisonnement utiles auprès d’experts hétérogènes : modèles additifs interprétables, ensembles d’arbres et réseaux neuronaux.", "Die Studie fragt, ob ein einziges Sprachmodell aus unterschiedlichen Expertenmodellen nützliche Schlussfolgerungsmuster lernen kann: interpretierbaren additiven Modellen, Baumensembles und neuronalen Netzen.", "이 연구는 하나의 언어 모델이 해석 가능한 가산 모델, 트리 앙상블, 신경망처럼 서로 다른 전문가 모델에서 유용한 추론 패턴을 배울 수 있는지 묻습니다."],
  ["idea.mapAria", "Conceptual illustration: a person's context and perceptions shape a choice", "概念图：人的情境和感知影响选择", "Schéma conceptuel : le contexte et les perceptions d’une personne façonnent son choix", "Konzeptgrafik: Kontext und Wahrnehmungen einer Person prägen ihre Entscheidung", "개념도: 개인의 맥락과 인식이 선택에 영향을 줍니다"],
  ["idea.input", "INPUT / THE PERSON", "输入 / 个人", "ENTRÉE / LA PERSONNE", "EINGABE / DIE PERSON", "입력 / 개인"],
  ["idea.context", "A lived context", "真实生活情境", "Un contexte vécu", "Gelebter Kontext", "삶의 맥락"],
  ["idea.demographics", "Demographics", "人口统计特征", "Démographie", "Demografie", "인구통계 정보"],
  ["idea.perceptions", "Perceptions", "感知", "Perceptions", "Wahrnehmungen", "인식"],
  ["idea.question", "Question", "问题", "Question", "Frage", "질문"],
  ["idea.process", "PROCESS / THE MODEL", "处理 / 模型", "PROCESSUS / LE MODÈLE", "VERARBEITUNG / DAS MODELL", "처리 / 모델"],
  ["idea.lenses", "Multiple lenses", "多种视角", "Plusieurs regards", "Mehrere Perspektiven", "다양한 관점"],
  ["idea.experts", "Additive · Tree · Neural", "加性 · 树模型 · 神经网络", "Additif · Arbres · Neuronal", "Additiv · Bäume · Neuronal", "가산 · 트리 · 신경망"],
  ["idea.output", "OUTPUT / THE TASK", "输出 / 任务", "SORTIE / LA TÂCHE", "AUSGABE / DIE AUFGABE", "출력 / 과제"],
  ["idea.predicted", "A predicted response", "预测的回答", "Une réponse prédite", "Eine vorhergesagte Antwort", "예측된 응답"],
  ["idea.choice", "Choice", "选择", "Choix", "Entscheidung", "선택"],
  ["idea.questionLevel", "Question-level prediction", "问题层面的预测", "Prédiction par question", "Vorhersage auf Fragenebene", "문항 단위 예측"],
  ["idea.caveat", "Conceptual overview. Generated reasoning is model-based evidence for prediction, not a verified account of any individual’s internal thought process.", "概念示意。生成的推理是基于模型的预测证据，并非对任何个人内在思维过程的验证性描述。", "Vue conceptuelle. Le raisonnement généré constitue un indice de prédiction fondé sur le modèle, et non une description vérifiée des pensées d’un individu.", "Konzeptueller Überblick. Generiertes Schlussfolgern liefert modellbasierte Hinweise für Vorhersagen, aber keine verifizierte Beschreibung innerer Gedankenprozesse einzelner Personen.", "개념적 개요입니다. 생성된 추론은 예측을 위한 모델 기반 근거이며, 개인의 내적 사고 과정을 검증해 재현한 것은 아닙니다."],
  ["statement.aria", "Research thesis", "研究主旨", "Thèse de recherche", "Forschungsthese", "연구의 핵심"],
  ["statement.line1", "Many perspectives.", "多种视角。", "De multiples perspectives.", "Viele Perspektiven.", "다양한 관점."],
  ["statement.line2", "One foundation model.", "一个基础模型。", "Un modèle de fondation.", "Ein Grundlagenmodell.", "하나의 파운데이션 모델."],
  ["statement.experts", "DIVERSE EXPERTS", "多样专家模型", "EXPERTS DIVERS", "VIELFÄLTIGE EXPERTEN", "다양한 전문가 모델"],
  ["statement.reasoning", "SHARED REASONING", "共享推理", "RAISONNEMENT PARTAGÉ", "GEMEINSAMES SCHLUSSFOLGERN", "공유된 추론"],
  ["approach.number", "THE APPROACH", "研究方法", "LA MÉTHODE", "DIE METHODE", "연구 방법"],
  ["approach.kicker", "FROM SIGNAL TO LANGUAGE", "从信号到语言", "DU SIGNAL AU LANGAGE", "VOM SIGNAL ZUR SPRACHE", "신호에서 언어로"],
  ["approach.heading1", "A different kind", "另一种", "Une autre forme", "Eine andere Art", "새로운 방식의"],
  ["approach.heading2", "of supervision", "监督方式", "de supervision", "der Supervision", "지도 학습"],
  ["approach.intro", "Three model families surface complementary evidence. SocialReasoner distills their decision signals into language model training data.", "三类模型提供互补证据。SocialReasoner 将它们的决策信号蒸馏为语言模型训练数据。", "Trois familles de modèles révèlent des indices complémentaires. SocialReasoner distille leurs signaux de décision en données d’entraînement pour un modèle de langage.", "Drei Modellfamilien liefern ergänzende Hinweise. SocialReasoner destilliert ihre Entscheidungssignale zu Trainingsdaten für ein Sprachmodell.", "세 가지 모델 계열은 상호 보완적인 근거를 드러냅니다. SocialReasoner는 그 결정 신호를 언어 모델 학습 데이터로 증류합니다."],
  ["stage.aria", "Method stages", "方法步骤", "Étapes de la méthode", "Methodenschritte", "방법 단계"],
  ["stage.0.label", "Gather experts", "汇集专家模型", "Réunir les experts", "Experten bündeln", "전문가 모델 모으기"],
  ["stage.1.label", "Read contributions", "读取特征贡献", "Lire les contributions", "Beiträge auslesen", "기여도 읽기"],
  ["stage.2.label", "Refine evidence", "提炼证据", "Affiner les indices", "Hinweise verfeinern", "근거 다듬기"],
  ["stage.3.label", "Distill a model", "蒸馏模型", "Distiller un modèle", "Ein Modell destillieren", "모델 증류하기"],
  ["stage.initialStep", "STEP 01 / 04", "步骤 01 / 04", "ÉTAPE 01 / 04", "SCHRITT 01 / 04", "단계 01 / 04"],
  ["stage.step", "STEP {current} / {total}", "步骤 {current} / {total}", "ÉTAPE {current} / {total}", "SCHRITT {current} / {total}", "단계 {current} / {total}"],
  ["stage.0.heading", "Experts see different structure.", "不同专家模型看见不同结构。", "Les experts perçoivent des structures différentes.", "Experten erkennen unterschiedliche Strukturen.", "전문가 모델마다 다른 구조를 포착합니다."],
  ["stage.0.body", "An explainable boosting model, a LightGBM tree ensemble, and a multilayer perceptron each learn useful links between respondent context and choices.", "可解释的提升模型、LightGBM 树集成和多层感知机分别学习受访者情境与选择之间的关联。", "Un modèle de boosting explicable, un ensemble d’arbres LightGBM et un perceptron multicouche apprennent chacun des liens utiles entre le contexte des répondants et leurs choix.", "Ein erklärbares Boosting-Modell, ein LightGBM-Baumensemble und ein mehrschichtiges Perzeptron lernen jeweils nützliche Zusammenhänge zwischen dem Kontext der Befragten und ihren Entscheidungen.", "설명 가능한 부스팅 모델, LightGBM 트리 앙상블, 다층 퍼셉트론이 각각 응답자의 맥락과 선택 사이의 유용한 관계를 학습합니다."],
  ["stage.1.heading", "Local signals become evidence.", "局部信号成为证据。", "Les signaux locaux deviennent des indices.", "Lokale Signale werden zu Hinweisen.", "국소 신호가 근거가 됩니다."],
  ["stage.1.body", "The method identifies high-contribution features from each expert: additive effects, tree-path attributions, and grouped neural perturbations.", "方法从各专家模型中识别高贡献特征：加性效应、树路径归因与分组神经扰动。", "La méthode repère les caractéristiques les plus contributives de chaque expert : effets additifs, attributions des chemins d’arbres et perturbations neuronales groupées.", "Die Methode ermittelt besonders einflussreiche Merkmale jedes Experten: additive Effekte, Attributionen entlang von Baumpfaden und gruppierte neuronale Störungen.", "이 방법은 가산 효과, 트리 경로 기여도, 그룹화된 신경망 교란을 통해 각 전문가 모델의 기여도가 높은 특성을 찾습니다."],
  ["stage.2.heading", "Language makes the signal legible.", "语言让信号更易理解。", "Le langage rend les signaux lisibles.", "Sprache macht Signale verständlich.", "언어가 신호를 이해하기 쉽게 만듭니다."],
  ["stage.2.body", "A language model filters noisy or implausible evidence and turns the remaining signals into several reasoning records for the same response.", "语言模型过滤噪声较大或不合理的证据，并将剩余信号转化为同一回答的多条推理记录。", "Un modèle de langage filtre les indices bruités ou peu plausibles, puis transforme les signaux restants en plusieurs traces de raisonnement pour une même réponse.", "Ein Sprachmodell filtert verrauschte oder unplausible Hinweise und wandelt die übrigen Signale in mehrere Schlussfolgerungsaufzeichnungen für dieselbe Antwort um.", "언어 모델이 잡음이 많거나 타당하지 않은 근거를 걸러내고, 남은 신호를 같은 응답에 대한 여러 추론 기록으로 바꿉니다."],
  ["stage.3.heading", "One model learns from all three.", "一个模型向三类专家学习。", "Un modèle apprend des trois experts.", "Ein Modell lernt von allen drei.", "하나의 모델이 세 전문가 모두에게 배웁니다."],
  ["stage.3.body", "The reasoning records are combined as supervised fine-tuning data, transferring complementary expert perspectives into SocialReasoner.", "推理记录被汇集为监督微调数据，将互补的专家视角迁移到 SocialReasoner 中。", "Les traces de raisonnement sont réunies en données de fine-tuning supervisé afin de transmettre à SocialReasoner les perspectives complémentaires des experts.", "Die Schlussfolgerungsaufzeichnungen werden zu Daten für überwachtes Fine-Tuning kombiniert. So fließen ergänzende Expertenperspektiven in SocialReasoner ein.", "추론 기록을 지도 미세 조정 데이터로 결합해 상호 보완적인 전문가 관점을 SocialReasoner에 전달합니다."],
  ["approach.figureSummary", "View the method figure from the manuscript", "查看论文中的方法图", "Voir la figure de la méthode dans le manuscrit", "Methodenabbildung aus dem Manuskript ansehen", "논문의 방법 그림 보기"],
  ["approach.figureAlt", "Method diagram: three experts yield feature contributions, which are semantically denoised into reasoning records and combined for supervised fine-tuning.", "方法图：三类专家模型给出特征贡献，经语义去噪形成推理记录，并用于监督微调。", "Schéma de la méthode : trois experts produisent des contributions de caractéristiques, filtrées sémantiquement en traces de raisonnement puis réunies pour un fine-tuning supervisé.", "Methodendiagramm: Drei Experten liefern Merkmalsbeiträge, die semantisch bereinigt, zu Schlussfolgerungsaufzeichnungen geformt und für überwachtes Fine-Tuning kombiniert werden.", "방법 그림: 세 전문가 모델의 특성 기여도를 의미적으로 정제해 추론 기록으로 만들고, 지도 미세 조정에 결합합니다."],
  ["approach.figureCaption", "Figure 3 in the manuscript. The illustration shows the full expert-to-reasoning-to-SFT pipeline.", "论文图 3。该图展示从专家模型、推理记录到监督微调的完整流程。", "Figure 3 du manuscrit. Elle présente la chaîne complète allant des experts au raisonnement puis au fine-tuning supervisé.", "Abbildung 3 des Manuskripts. Sie zeigt den vollständigen Ablauf von Expertenmodellen über Schlussfolgerungen bis zum überwachten Fine-Tuning.", "논문 그림 3. 전문가 모델에서 추론, 지도 미세 조정으로 이어지는 전체 과정을 보여 줍니다."],
  ["evidence.number", "THE EVIDENCE", "研究结果", "LES RÉSULTATS", "DIE ERGEBNISSE", "연구 결과"],
  ["evidence.kicker", "REPORTED RESULTS", "论文报告结果", "RÉSULTATS RAPPORTÉS", "BERICHTETE ERGEBNISSE", "논문 보고 결과"],
  ["evidence.heading1", "A clearer signal", "更清晰的信号", "Un signal plus net", "Ein klareres Signal", "더 선명한 신호"],
  ["evidence.heading2", "across surveys", "跨越多项调查", "dans plusieurs enquêtes", "über mehrere Umfragen hinweg", "여러 설문에서"],
  ["evidence.intro", "Compare base instruction models with SocialReasoner on the manuscript’s eight main evaluation datasets. Every bar shows reported accuracy.", "比较基础指令模型与 SocialReasoner 在论文八个主要评估数据集上的表现。每条柱形表示论文报告的准确率。", "Comparez les modèles d’instruction de base à SocialReasoner sur les huit principaux jeux de données évalués dans le manuscrit. Chaque barre montre l’exactitude rapportée.", "Vergleichen Sie Basis-Instruktionsmodelle mit SocialReasoner auf den acht zentralen Evaluationsdatensätzen des Manuskripts. Jeder Balken zeigt die berichtete Genauigkeit.", "논문의 주요 평가 데이터셋 8개에서 기본 지시 모델과 SocialReasoner를 비교합니다. 각 막대는 논문에 보고된 정확도를 나타냅니다."],
  ["evidence.table", "TABLE 1 / EIGHT DATASETS", "表 1 / 八个数据集", "TABLEAU 1 / HUIT JEUX DE DONNÉES", "TABELLE 1 / ACHT DATENSÄTZE", "표 1 / 데이터셋 8개"],
  ["evidence.prediction", "Respondent-level prediction", "受访者层面的预测", "Prédiction au niveau des répondants", "Vorhersage auf Befragtenebene", "응답자 단위 예측"],
  ["evidence.modelAria", "Select base language model", "选择基础语言模型", "Choisir le modèle de langage de base", "Basis-Sprachmodell auswählen", "기본 언어 모델 선택"],
  ["evidence.relativeGain", "AVERAGE RELATIVE GAIN", "平均相对提升", "GAIN RELATIF MOYEN", "MITTLERER RELATIVER ZUWACHS", "평균 상대 향상"],
  ["evidence.meanBase", "MEAN BASE ACCURACY", "基础模型平均准确率", "EXACTITUDE MOYENNE DE BASE", "MITTLERE BASISGENAUIGKEIT", "기본 모델 평균 정확도"],
  ["evidence.meanOurs", "MEAN WITH SOCIALREASONER", "SOCIALREASONER 平均准确率", "MOYENNE AVEC SOCIALREASONER", "MITTELWERT MIT SOCIALREASONER", "SOCIALREASONER 평균 정확도"],
  ["evidence.dataset", "DATASET", "数据集", "JEU DE DONNÉES", "DATENSATZ", "데이터셋"],
  ["evidence.accuracy", "ACCURACY (%)", "准确率 (%)", "EXACTITUDE (%)", "GENAUIGKEIT (%)", "정확도 (%)"],
  ["evidence.chartAriaInitial", "Accuracy chart", "准确率图表", "Graphique de l’exactitude", "Genauigkeitsdiagramm", "정확도 차트"],
  ["evidence.chartAria", "{model} accuracy on eight datasets, Base versus SocialReasoner", "{model} 在八个数据集上的准确率：基础模型与 SocialReasoner 对比", "Exactitude de {model} sur huit jeux de données : modèle de base contre SocialReasoner", "Genauigkeit von {model} auf acht Datensätzen: Basismodell gegenüber SocialReasoner", "{model}의 데이터셋 8개 정확도: 기본 모델과 SocialReasoner 비교"],
  ["evidence.rowAria", "{dataset}: base {base} percent, SocialReasoner {ours} percent", "{dataset}：基础模型 {base}%，SocialReasoner {ours}%", "{dataset} : modèle de base {base} %, SocialReasoner {ours} %", "{dataset}: Basismodell {base} Prozent, SocialReasoner {ours} Prozent", "{dataset}: 기본 모델 {base}%, SocialReasoner {ours}%"],
  ["evidence.base", "Base", "基础模型", "Base", "Basis", "기본 모델"],
  ["evidence.withOurs", "With SocialReasoner", "使用 SocialReasoner", "Avec SocialReasoner", "Mit SocialReasoner", "SocialReasoner 적용"],
  ["evidence.note", "Accuracy (%) from Table 1 of the manuscript. The relative gain is reported by the paper; means above are arithmetic averages of the displayed rounded dataset values.", "准确率 (%) 引自论文表 1。相对提升采用论文报告值；上方均值为所展示的各数据集四舍五入数值的算术平均。", "Exactitude (%) issue du tableau 1 du manuscrit. Le gain relatif est celui rapporté dans l’article ; les moyennes ci-dessus sont les moyennes arithmétiques des valeurs arrondies affichées.", "Genauigkeit (%) aus Tabelle 1 des Manuskripts. Der relative Zuwachs stammt aus dem Paper; die Mittelwerte oben sind arithmetische Mittel der angezeigten gerundeten Datensatzwerte.", "정확도(%)는 논문 표 1에서 가져왔습니다. 상대 향상은 논문 보고값이며, 위 평균은 표시된 반올림 수치의 산술 평균입니다."],
  ["evidence.outside", "OUTSIDE THE MAIN EIGHT", "八个主要数据集之外", "AU-DELÀ DES HUIT PRINCIPAUX", "AUSSERHALB DER ACHT HAUPTDATENSÄTZE", "주요 데이터셋 8개 외"],
  ["evidence.transfer", "Test the transfer, too.", "也检验迁移能力。", "Tester aussi le transfert.", "Auch den Transfer testen.", "전이 성능도 시험합니다."],
  ["evidence.transferBody", "The manuscript also evaluates transfer to held-out GSS 2022 data and examines how well predicted group-level response distributions align with observed ones.", "论文还评估了在留出 GSS 2022 数据上的迁移表现，以及预测的群体回答分布与实际观测分布的吻合程度。", "Le manuscrit évalue aussi le transfert vers les données GSS 2022 tenues à l’écart et examine l’accord entre distributions de réponses prédites et observées au niveau des groupes.", "Das Manuskript bewertet außerdem den Transfer auf zurückgehaltene GSS-2022-Daten und untersucht, wie gut vorhergesagte Antwortverteilungen auf Gruppenebene mit den beobachteten übereinstimmen.", "논문은 학습에서 제외한 GSS 2022 데이터로의 전이도 평가하고, 예측한 집단별 응답 분포가 관측값과 얼마나 일치하는지 살펴봅니다."],
  ["coverage.number", "THE GEOGRAPHY", "地区分布", "LA GÉOGRAPHIE", "DIE GEOGRAFIE", "지역 분포"],
  ["coverage.kicker", "EXPLORE THE SAMPLE", "探索样本", "EXPLORER L’ÉCHANTILLON", "STICHPROBE ERKUNDEN", "표본 살펴보기"],
  ["coverage.heading1", "Social reasoning", "社会推理", "Le raisonnement social", "Soziales Schlussfolgern", "사회적 추론"],
  ["coverage.heading2", "across the world.", "遍及世界。", "à travers le monde.", "weltweit.", "전 세계에 걸쳐."],
  ["coverage.intro", "Explore geographic coverage from the prepared research datasets. The globe uses survey region centers as map markers; they do not represent individual people or precise respondent locations.", "探索已整理研究数据集的地区覆盖范围。地球上的标记采用调查地区中心点，不代表个人或受访者的精确位置。", "Explorez la couverture géographique des jeux de données de recherche préparés. Les marqueurs du globe indiquent les centres des régions d’enquête, pas des individus ni leur position précise.", "Entdecken Sie die geografische Abdeckung der aufbereiteten Forschungsdatensätze. Die Markierungen auf dem Globus liegen an den Mittelpunkten der Erhebungsregionen; sie zeigen weder Einzelpersonen noch genaue Aufenthaltsorte.", "준비된 연구 데이터셋의 지역 범위를 살펴보세요. 지구본의 표시는 조사 지역 중심점을 사용하며, 개인이나 응답자의 정확한 위치를 뜻하지 않습니다."],
  ["coverage.region", "SURVEY REGION", "调查地区", "RÉGION D’ENQUÊTE", "ERHEBUNGSREGION", "조사 지역"],
  ["coverage.chooseRegion", "Choose a region", "选择地区", "Choisir une région", "Region wählen", "지역 선택"],
  ["coverage.respondents", "SURVEY RESPONDENTS", "调查受访者", "RÉPONDANTS AUX ENQUÊTES", "BEFRAGTE", "설문 응답자"],
  ["coverage.regions", "SURVEY REGIONS", "调查地区", "RÉGIONS D’ENQUÊTE", "ERHEBUNGSREGIONEN", "조사 지역"],
  ["coverage.selectedRegion", "SELECTED REGION", "选中地区", "RÉGION SÉLECTIONNÉE", "AUSGEWÄHLTE REGION", "선택한 지역"],
  ["coverage.allRegions", "All regions", "所有地区", "Toutes les régions", "Alle Regionen", "모든 지역"],
  ["coverage.regionShort", "REGION", "地区", "RÉGION", "REGION", "지역"],
  ["coverage.respondentsShort", "RESPONDENTS", "受访者", "RÉPONDANTS", "BEFRAGTE", "응답자"],
  ["coverage.preparing", "Preparing geographic index…", "正在整理地区索引…", "Préparation de l’index géographique…", "Geografischer Index wird vorbereitet…", "지역 색인 준비 중…"],
  ["coverage.howCounted", "How coverage is counted", "覆盖范围如何统计", "Comment la couverture est comptée", "Wie die Abdeckung gezählt wird", "지역 범위 집계 방식"],
  ["coverage.loadingMethod", "Loading source methodology.", "正在加载来源与统计方法。", "Chargement de la méthode de calcul.", "Quellenmethodik wird geladen.", "출처와 집계 방법 불러오는 중."],
  ["release.number", "THE RELEASE", "开放发布", "LA PUBLICATION", "DIE VERÖFFENTLICHUNG", "공개 예정"],
  ["release.kicker", "MORE SOON", "更多内容即将发布", "BIENTÔT PLUS", "BALD MEHR", "더 많은 자료 곧 공개"],
  ["release.heading1", "The next chapter", "下一篇章", "Le prochain chapitre", "Das nächste Kapitel", "다음 장은"],
  ["release.heading2", "will be", "将", "sera", "wird", "곧"],
  ["release.heading3", "open.", "开放。", "ouvert.", "offen sein.", "열립니다."],
  ["release.intro", "We are preparing the research materials for public release. The three links below will activate as each resource becomes available.", "我们正在准备公开研究资料。下方三个链接会在对应资源开放时启用。", "Nous préparons les ressources de recherche pour une publication publique. Les trois liens ci-dessous seront activés au fur et à mesure de leur disponibilité.", "Wir bereiten die Forschungsmaterialien für die öffentliche Freigabe vor. Die drei Links unten werden aktiviert, sobald die jeweiligen Ressourcen verfügbar sind.", "연구 자료의 공개를 준비하고 있습니다. 아래 세 링크는 각 자료가 준비되는 대로 활성화됩니다."],
  ["release.openResearch", "OPEN RESEARCH / OPEN SOURCE / OPEN MODELS", "开放研究 / 开源代码 / 开放模型", "RECHERCHE OUVERTE / CODE OUVERT / MODÈLES OUVERTS", "OFFENE FORSCHUNG / OPEN SOURCE / OFFENE MODELLE", "공개 연구 / 오픈 소스 / 공개 모델"],
  ["footer.backTop", "BACK TO TOP ↑", "返回顶部 ↑", "RETOUR EN HAUT ↑", "ZURÜCK NACH OBEN ↑", "맨 위로 ↑"],
  ["footer.preview", "Research preview · Open release coming soon", "研究预览 · 开放资源即将发布", "Aperçu de recherche · Publication ouverte à venir", "Forschungsvorschau · Offene Veröffentlichung folgt", "연구 미리보기 · 공개 자료 곧 제공"]
];

const SOCIAL_I18N_CODES = ["en", "zh", "fr", "de", "ko"];
const SOCIAL_INTL_LOCALES = { en: "en-US", zh: "zh-CN", fr: "fr-FR", de: "de-DE", ko: "ko-KR" };
const SOCIAL_HTML_LANGS = { en: "en", zh: "zh-CN", fr: "fr", de: "de", ko: "ko" };
const SOCIAL_OG_LOCALES = { en: "en_US", zh: "zh_CN", fr: "fr_FR", de: "de_DE", ko: "ko_KR" };
const SOCIAL_I18N_MESSAGES = Object.fromEntries(SOCIAL_I18N_CODES.map((code, index) => [code, Object.fromEntries(SOCIAL_I18N_ROWS.map(row => [row[0], row[index + 1]]))]));
window.SOCIAL_I18N_ROWS = SOCIAL_I18N_ROWS;
window.SOCIAL_I18N_MESSAGES = SOCIAL_I18N_MESSAGES;

const SOCIAL_I18N_STORAGE_KEY = "socialreasoner-language";
function socialI18nLookup(root, path) {
  if (!root) return undefined;
  if (Object.prototype.hasOwnProperty.call(root, path)) return root[path];
  return path.split(".").reduce((value, part) => value && value[part], root);
}
function socialI18nInitialLanguage() {
  let query;
  try { query = new URLSearchParams(window.location.search).get("lang"); } catch { /* embedded previews */ }
  if (SOCIAL_I18N_CODES.includes(query)) return query;
  try {
    const saved = window.localStorage.getItem(SOCIAL_I18N_STORAGE_KEY);
    if (SOCIAL_I18N_CODES.includes(saved)) return saved;
  } catch { /* private browsing may block storage */ }
  return "en";
}
let socialI18nLanguage = socialI18nInitialLanguage();
function socialI18nT(key, params = {}) {
  const source = key.startsWith("globe.") ? window.SOCIAL_GLOBE_MESSAGES : SOCIAL_I18N_MESSAGES;
  const messageKey = key.startsWith("globe.") ? key.slice(6) : key;
  const message = socialI18nLookup(source && source[socialI18nLanguage], messageKey)
    ?? socialI18nLookup(source && source.en, messageKey)
    ?? key;
  return String(message).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
}
function socialI18nApply() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = SOCIAL_HTML_LANGS[socialI18nLanguage];
  document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = socialI18nT(node.dataset.i18n); });
  for (const [attribute, property] of [["data-i18n-aria-label", "aria-label"], ["data-i18n-alt", "alt"], ["data-i18n-content", "content"], ["data-i18n-title", "title"]]) {
    document.querySelectorAll(`[${attribute}]`).forEach(node => node.setAttribute(property, socialI18nT(node.getAttribute(attribute))));
  }
  const select = document.getElementById("site-language");
  if (select) select.value = socialI18nLanguage;
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) ogLocale.content = SOCIAL_OG_LOCALES[socialI18nLanguage];
}
function socialI18nSetLanguage(language, options = {}) {
  if (!SOCIAL_I18N_CODES.includes(language)) return false;
  socialI18nLanguage = language;
  try { window.localStorage.setItem(SOCIAL_I18N_STORAGE_KEY, language); } catch { /* optional */ }
  if (options.updateUrl) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", language);
      window.history.replaceState(window.history.state, "", url);
    } catch { /* embedded previews */ }
  }
  socialI18nApply();
  window.dispatchEvent(new CustomEvent("site:languagechange", { detail: { language } }));
  return true;
}
window.SiteI18n = {
  t: socialI18nT,
  get language() { return socialI18nLanguage; },
  number(value, options) { return new Intl.NumberFormat(SOCIAL_INTL_LOCALES[socialI18nLanguage], options).format(value); },
  setLanguage: socialI18nSetLanguage,
  apply: socialI18nApply
};
if (typeof document !== "undefined") {
  socialI18nApply();
  document.getElementById("site-language")?.addEventListener("change", event => socialI18nSetLanguage(event.target.value, { updateUrl: true }));
  window.addEventListener("popstate", () => {
    const query = new URLSearchParams(window.location.search).get("lang");
    if (SOCIAL_I18N_CODES.includes(query)) socialI18nSetLanguage(query);
  });
}
