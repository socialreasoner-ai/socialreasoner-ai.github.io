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
  ["nav.idea", "Overview", "概览", "Aperçu", "Überblick", "개요"],
  ["nav.approach", "Method", "方法", "Méthode", "Methode", "방법"],
  ["nav.evidence", "Results", "结果", "Résultats", "Ergebnisse", "결과"],
  ["nav.coverage", "Data", "数据", "Données", "Daten", "데이터"],
  ["nav.release", "Resources", "资源", "Ressources", "Ressourcen", "자료"],
  ["nav.resources", "Explore resources", "查看资源", "Explorer les ressources", "Ressourcen ansehen", "자료 살펴보기"],
  ["nav.resourcesShort", "Resources ↗", "资源 ↗", "Ressources ↗", "Ressourcen ↗", "자료 ↗"],
  ["nav.openMenu", "Open menu", "打开菜单", "Ouvrir le menu", "Menü öffnen", "메뉴 열기"],
  ["nav.closeMenu", "Close menu", "关闭菜单", "Fermer le menu", "Menü schließen", "메뉴 닫기"],
  ["hero.preview", "RESEARCH PREVIEW", "研究预览", "APERÇU DE RECHERCHE", "FORSCHUNGSVORSCHAU", "연구 미리보기"],
  ["hero.releaseSoon", "OPEN RELEASE COMING SOON", "开放资源即将发布", "PUBLICATION OUVERTE À VENIR", "OFFENE VERÖFFENTLICHUNG FOLGT", "공개 자료 곧 제공"],
  ["paper.title", "Learning a Foundation Model of Human Social Reasoning from Heterogeneous Experts", "从多类型专家模型中学习人类社会推理基础模型", "Apprendre un modèle de fondation du raisonnement social humain à partir d’experts hétérogènes", "Ein Grundlagenmodell menschlichen sozialen Schlussfolgerns aus unterschiedlichen Expertenmodellen lernen", "서로 다른 전문가 모델에서 인간 사회적 추론의 파운데이션 모델 학습"],
  ["hero.description", "SocialReasoner turns evidence from heterogeneous predictive models into reasoning supervision for language models, improving survey response prediction from demographics and perceptions.", "SocialReasoner 将不同预测模型提供的证据转化为语言模型的推理监督，利用人口统计特征与个人感知提高调查回答预测准确率。", "SocialReasoner transforme les indices fournis par différents modèles prédictifs en données de supervision du raisonnement pour les modèles de langage, afin d’améliorer la prédiction des réponses aux enquêtes à partir des caractéristiques démographiques et des perceptions.", "SocialReasoner wandelt die Evidenz verschiedener Vorhersagemodelle in Schlussfolgerungsdaten für das Training von Sprachmodellen um und verbessert so die Vorhersage von Umfrageantworten anhand demografischer Merkmale und Wahrnehmungen.", "SocialReasoner는 서로 다른 예측 모델의 근거를 언어 모델의 추론 학습 자료로 바꾸어 인구통계 특성과 인식을 바탕으로 설문 응답을 더 정확하게 예측합니다."],
  ["hero.exploreMethod", "Explore the method", "了解方法", "Explorer la méthode", "Methode erkunden", "방법 살펴보기"],
  ["hero.seeEvidence", "View results", "查看结果", "Voir les résultats", "Ergebnisse ansehen", "결과 보기"],
  ["resource.data", "Data", "数据", "Données", "Daten", "데이터"],
  ["resource.code", "Code", "代码", "Code", "Code", "코드"],
  ["resource.model", "Models", "模型", "Modèles", "Modelle", "모델"],
  ["resource.hfSoon", "Hugging Face · Coming soon", "Hugging Face · 即将开放", "Hugging Face · Bientôt disponible", "Hugging Face · Demnächst", "Hugging Face · 공개 예정"],
  ["resource.githubSoon", "GitHub · Coming soon", "GitHub · 即将开放", "GitHub · Bientôt disponible", "GitHub · Demnächst", "GitHub · 공개 예정"],
  ["resource.upcomingAria", "Upcoming resources", "即将开放的资源", "Ressources à venir", "Künftige Ressourcen", "공개 예정 자료"],
  ["resource.releaseAria", "Release status", "资源发布状态", "Statut de publication", "Veröffentlichungsstatus", "자료 공개 현황"],
  ["resource.comingSoon", "Coming soon", "即将开放", "Bientôt disponible", "Demnächst", "공개 예정"],
  ["resource.open", "Open resource ↗", "打开资源 ↗", "Ouvrir la ressource ↗", "Ressource öffnen ↗", "자료 열기 ↗"],
  ["hero.globeAria", "Interactive globe showing respondent counts by survey region", "按调查地区显示受访者数量的交互式地球", "Globe interactif indiquant le nombre de répondants par région d’enquête", "Interaktiver Globus mit Befragtenzahlen nach Erhebungsregion", "조사 지역별 응답자 수를 보여 주는 대화형 지구본"],
  ["hero.canvasAria", "Drag to rotate the world globe. Select a dataset or region using the controls below for keyboard access.", "拖动地球进行旋转。使用下方控件可通过键盘选择数据集或地区。", "Faites glisser le globe pour le faire tourner. Utilisez les commandes ci-dessous pour choisir un jeu de données ou une région au clavier.", "Ziehen Sie den Globus zum Drehen. Mit den Steuerelementen unten können Sie Datensatz oder Region per Tastatur wählen.", "지구본을 드래그해 회전하세요. 키보드로는 아래 조작 도구에서 데이터셋이나 지역을 선택하세요."],
  ["hero.geoCoverage", "SURVEY COVERAGE", "调查覆盖范围", "COUVERTURE DES ENQUÊTES", "UMFRAGEABDECKUNG", "조사 지역 분포"],
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
  ["hero.drag", "Drag to explore", "拖动探索", "Faire glisser pour explorer", "Zum Erkunden ziehen", "드래그하여 탐색"],
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
  ["stage.0.label", "Train experts", "训练专家模型", "Entraîner les experts", "Experten trainieren", "전문가 모델 학습"],
  ["stage.1.label", "Extract evidence", "提取证据", "Extraire les indices", "Evidenz extrahieren", "근거 추출"],
  ["stage.2.label", "Build supervision", "构建监督数据", "Construire la supervision", "Trainingsdaten erstellen", "학습 자료 구성"],
  ["stage.3.label", "Fine-tune models", "微调模型", "Affiner les modèles", "Modelle feinabstimmen", "모델 미세 조정"],
  ["stage.initialStep", "STEP 01 / 04", "步骤 01 / 04", "ÉTAPE 01 / 04", "SCHRITT 01 / 04", "단계 01 / 04"],
  ["stage.step", "STEP {current} / {total}", "步骤 {current} / {total}", "ÉTAPE {current} / {total}", "SCHRITT {current} / {total}", "단계 {current} / {total}"],
  ["stage.0.heading", "Three distinct predictive models", "三种不同的预测模型", "Trois modèles prédictifs distincts", "Drei verschiedene Vorhersagemodelle", "서로 다른 세 가지 예측 모델"],
  ["stage.0.body", "Each expert learns associations between respondent information and survey answers.", "每个专家模型分别学习受访者信息与调查回答之间的关联。", "Chaque expert apprend séparément les liens entre les données des répondants et leurs réponses aux enquêtes.", "Jedes Expertenmodell lernt Zusammenhänge zwischen Angaben zu den Befragten und ihren Umfrageantworten.", "각 전문가 모델은 응답자 정보와 설문 답변 사이의 관계를 학습합니다."],
  ["stage.1.heading", "Keep correct out-of-fold predictions", "保留折外预测正确的样本", "Conserver les prédictions hors pli correctes", "Korrekte Out-of-Fold-Vorhersagen behalten", "정답을 맞힌 폴드 외 예측만 남기기"],
  ["stage.1.body", "For each retained answer, identify the features that support its prediction within each expert.", "对每个保留的回答，分别找出各专家模型中支持这一预测的特征。", "Pour chaque réponse retenue, identifier dans chaque expert les caractéristiques qui étayent sa prédiction.", "Für jede behaltene Antwort werden die Merkmale ermittelt, die ihre Vorhersage in jedem Expertenmodell stützen.", "남긴 각 답변에 대해 전문가 모델별로 해당 예측을 뒷받침하는 특성을 찾습니다."],
  ["stage.2.heading", "Semantic denoising makes evidence usable", "语义去噪让证据更可用", "Le débruitage sémantique rend les indices exploitables", "Semantische Rauschfilterung macht Evidenz nutzbar", "의미적 노이즈 제거로 근거 정제"],
  ["stage.2.body", "Filter irrelevant or implausible evidence and express the remaining signals as natural-language reasoning records.", "过滤无关或不合理的证据，再将剩余信号表达为自然语言推理记录。", "Filtrer les indices non pertinents ou peu plausibles, puis exprimer les signaux restants sous forme de traces de raisonnement en langue naturelle.", "Irrelevante oder unplausible Evidenz wird gefiltert; die übrigen Signale werden als natürlichsprachliche Schlussfolgerungsaufzeichnungen formuliert.", "관련 없거나 타당하지 않은 근거를 걸러 남은 신호를 자연어 추론 기록으로 만듭니다."],
  ["stage.3.heading", "Learn from the combined reasoning records", "学习合并后的推理记录", "Apprendre des traces de raisonnement réunies", "Aus kombinierten Schlussfolgerungsaufzeichnungen lernen", "결합된 추론 기록에서 학습"],
  ["stage.3.body", "Supervised fine-tuning transfers complementary evidence from all three experts into SocialReasoner.", "通过监督微调，将三类专家模型的互补证据迁移到 SocialReasoner。", "Le fine-tuning supervisé transmet à SocialReasoner les indices complémentaires des trois experts.", "Überwachtes Fine-Tuning überträgt die ergänzende Evidenz aller drei Experten in SocialReasoner.", "지도 미세 조정으로 세 전문가 모델의 상호 보완적 근거를 SocialReasoner에 전달합니다."],
  ["approach.figureSummary", "View the method figure from the manuscript", "查看论文中的方法图", "Voir la figure de la méthode dans le manuscrit", "Methodenabbildung aus dem Manuskript ansehen", "논문의 방법 그림 보기"],
  ["approach.figureAlt", "Method diagram: three experts yield feature contributions, which are semantically denoised into reasoning records and combined for supervised fine-tuning.", "方法图：三类专家模型给出特征贡献，经语义去噪形成推理记录，并用于监督微调。", "Schéma de la méthode : trois experts produisent des contributions de caractéristiques, filtrées sémantiquement en traces de raisonnement puis réunies pour un fine-tuning supervisé.", "Methodendiagramm: Drei Experten liefern Merkmalsbeiträge, die semantisch bereinigt, zu Schlussfolgerungsaufzeichnungen geformt und für überwachtes Fine-Tuning kombiniert werden.", "방법 그림: 세 전문가 모델의 특성 기여도를 의미적으로 정제해 추론 기록으로 만들고, 지도 미세 조정에 결합합니다."],
  ["approach.figureCaption", "Figure 3 in the manuscript. The illustration shows the full expert-to-reasoning-to-SFT pipeline.", "论文图 3。该图展示从专家模型、推理记录到监督微调的完整流程。", "Figure 3 du manuscrit. Elle présente la chaîne complète allant des experts au raisonnement puis au fine-tuning supervisé.", "Abbildung 3 des Manuskripts. Sie zeigt den vollständigen Ablauf von Expertenmodellen über Schlussfolgerungen bis zum überwachten Fine-Tuning.", "논문 그림 3. 전문가 모델에서 추론, 지도 미세 조정으로 이어지는 전체 과정을 보여 줍니다."],
  ["evidence.number", "RESULTS", "结果", "RÉSULTATS", "ERGEBNISSE", "결과"],
  ["evidence.kicker", "REPORTED RESULTS", "论文报告结果", "RÉSULTATS RAPPORTÉS", "BERICHTETE ERGEBNISSE", "논문 보고 결과"],
  ["evidence.heading1", "A clearer signal", "更清晰的信号", "Un signal plus net", "Ein klareres Signal", "더 선명한 신호"],
  ["evidence.heading2", "across surveys", "跨越多项调查", "dans plusieurs enquêtes", "über mehrere Umfragen hinweg", "여러 설문에서"],
  ["evidence.intro", "SocialReasoner improves survey response prediction across eight evaluation datasets. Select a backbone to compare every result.", "SocialReasoner 在八个评估数据集上提高了调查回答预测准确率。选择基础模型可查看每项结果。", "SocialReasoner améliore la prédiction des réponses aux enquêtes sur huit jeux de données d’évaluation. Sélectionnez un modèle de base pour comparer chaque résultat.", "SocialReasoner verbessert die Vorhersage von Umfrageantworten auf acht Evaluierungsdatensätzen. Wählen Sie ein Basismodell, um alle Ergebnisse zu vergleichen.", "SocialReasoner는 8개 평가 데이터셋에서 설문 응답 예측 정확도를 높입니다. 기본 모델을 선택해 각 결과를 비교하세요."],
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
  ["coverage.intro", "Respondents in the manuscript, aggregated by country/region.", "按论文口径，以国家或地区汇总受访者。", "Personnes interrogées dans le manuscrit, agrégées par pays ou région.", "Befragte des Manuskripts, nach Land oder Region zusammengefasst.", "논문 기준 응답자를 국가 또는 지역별로 집계했습니다."],
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
  ["release.intro", "Code, data, and model checkpoints will be available here.", "代码、数据和模型权重将在这里开放。", "Le code, les données et les poids des modèles seront disponibles ici.", "Code, Daten und Modellgewichte werden hier verfügbar sein.", "코드, 데이터와 모델 가중치는 이곳에 공개됩니다."],
  ["release.openResearch", "OPEN RESEARCH / OPEN SOURCE / OPEN MODELS", "开放研究 / 开源代码 / 开放模型", "RECHERCHE OUVERTE / CODE OUVERT / MODÈLES OUVERTS", "OFFENE FORSCHUNG / OPEN SOURCE / OFFENE MODELLE", "공개 연구 / 오픈 소스 / 공개 모델"],
  ["footer.backTop", "BACK TO TOP ↑", "返回顶部 ↑", "RETOUR EN HAUT ↑", "ZURÜCK NACH OBEN ↑", "맨 위로 ↑"],
  ["footer.preview", "SocialReasoner research project", "SocialReasoner 研究项目", "Projet de recherche SocialReasoner", "SocialReasoner-Forschungsprojekt", "SocialReasoner 연구 프로젝트"],
  ["overview.heading", "Beyond demographics", "超越人口统计特征", "Au-delà des données démographiques", "Über demografische Merkmale hinaus", "인구통계 정보 그 이상"],
  ["overview.body", "Beliefs and perceptions help explain why people with similar demographics answer differently. SocialReasoner learns from the predictive evidence of heterogeneous experts.", "信念与感知有助于解释人口统计特征相近的人为何给出不同回答。SocialReasoner 从不同专家模型的预测证据中学习。", "Les croyances et les perceptions aident à comprendre pourquoi des personnes aux caractéristiques démographiques similaires répondent différemment. SocialReasoner apprend des indices prédictifs fournis par différents experts.", "Überzeugungen und Wahrnehmungen helfen zu erklären, warum Menschen mit ähnlichen demografischen Merkmalen unterschiedlich antworten. SocialReasoner lernt aus der Vorhersageevidenz verschiedener Expertenmodelle.", "믿음과 인식은 인구통계 특성이 비슷한 사람들이 왜 다르게 답하는지 설명하는 데 도움이 됩니다. SocialReasoner는 서로 다른 전문가 모델의 예측 근거에서 학습합니다."],
  ["method.kicker", "METHOD", "方法", "MÉTHODE", "METHODE", "방법"],
  ["method.heading", "Learning from heterogeneous experts", "从不同专家模型中学习", "Apprendre de différents experts", "Von unterschiedlichen Experten lernen", "서로 다른 전문가 모델에서 학습"],
  ["method.intro", "Three experts provide complementary evidence. Their reasoning records become supervision for a single language model.", "三类专家模型提供互补证据。它们生成的推理记录共同监督一个语言模型。", "Trois experts fournissent des indices complémentaires. Leurs traces de raisonnement servent ensemble à entraîner un seul modèle de langage.", "Drei Expertenmodelle liefern ergänzende Evidenz. Ihre Schlussfolgerungsaufzeichnungen dienen gemeinsam als Trainingsdaten für ein Sprachmodell.", "세 전문가 모델이 상호 보완적인 근거를 제공합니다. 이들의 추론 기록은 하나의 언어 모델을 학습시키는 데 함께 사용됩니다."],
  ["method.flowAria", "Four-stage training pipeline, from predictive experts to SocialReasoner", "从预测专家模型到 SocialReasoner 的四阶段训练流程", "Pipeline d’entraînement en quatre étapes, des experts prédictifs à SocialReasoner", "Vierstufiger Trainingsablauf von Vorhersageexperten bis SocialReasoner", "예측 전문가 모델에서 SocialReasoner까지 이어지는 4단계 학습 과정"],
  ["method.flowHint", "Select a stage to inspect its inputs and outputs.", "选择阶段可查看输入与输出。", "Sélectionnez une étape pour voir ses entrées et ses sorties.", "Wählen Sie eine Phase, um Ein- und Ausgaben zu sehen.", "단계를 선택하면 입력과 출력을 볼 수 있습니다."],
  ["method.training", "Training-data construction", "训练数据构建", "Construction des données d’entraînement", "Erstellung der Trainingsdaten", "학습 데이터 구성"],
  ["method.inputLabel", "Input", "输入", "Entrée", "Eingabe", "입력"],
  ["method.outputLabel", "Output", "输出", "Sortie", "Ausgabe", "출력"],
  ["method.details", "Method details", "方法细节", "Détails de la méthode", "Methodische Details", "방법 상세"],
  ["method.detailsBody", "EBM, LightGBM, and MLP are trained on respondent data. Correct out-of-fold (OOF) predictions provide answer-specific evidence: additive feature effects, tree-path attributions, and grouped neural perturbations. Top-K evidence is filtered through semantic denoising to form natural-language reasoning records. Records from the experts are combined as reasoning–answer pairs for supervised fine-tuning (SFT). The experts construct training supervision; they do not vote at language-model inference time, and their attribution scores are not added together.", "EBM、LightGBM 和 MLP 在受访者数据上训练。保留折外预测（OOF）正确的样本，再为每个回答提取相应证据，包括加性特征效应、树路径归因和分组神经扰动。通过语义去噪过滤 Top-K 证据，形成自然语言推理记录。不同专家的记录共同组成推理—回答样本，用于监督微调（SFT）。专家模型参与训练数据构建，不在语言模型推理时实时投票，其归因分数也不会直接相加。", "Les modèles EBM, LightGBM et MLP sont entraînés sur les données des répondants. Les prédictions correctes hors pli (OOF) fournissent des indices propres à chaque réponse : effets additifs des caractéristiques, attributions des chemins d’arbres et perturbations neuronales groupées. Les indices Top-K sont filtrés par débruitage sémantique afin de former des traces de raisonnement en langue naturelle. Les traces des experts sont réunies en paires raisonnement–réponse pour le fine-tuning supervisé (SFT). Les experts servent à construire les données d’entraînement ; ils ne votent pas pendant l’inférence du modèle de langage et leurs scores d’attribution ne sont pas additionnés.", "EBM, LightGBM und MLP werden mit Befragtendaten trainiert. Korrekte Out-of-Fold-Vorhersagen (OOF) liefern antwortspezifische Evidenz: additive Merkmalseffekte, Attributionen entlang von Baumpfaden und gruppierte neuronale Störungen. Top-K-Evidenz wird durch semantische Rauschfilterung bereinigt und in natürlichsprachliche Schlussfolgerungsaufzeichnungen übertragen. Aufzeichnungen verschiedener Experten bilden gemeinsam Schlussfolgerung–Antwort-Paare für überwachtes Fine-Tuning (SFT). Die Experten erstellen Trainingsdaten; sie stimmen bei der Inferenz des Sprachmodells nicht live ab und ihre Attributionswerte werden nicht direkt addiert.", "EBM, LightGBM, MLP를 응답자 데이터로 학습합니다. 정답을 맞힌 폴드 외 예측(OOF)에서 답변별 근거인 가산 특성 효과, 트리 경로 기여도, 그룹화된 신경망 교란을 추출합니다. Top-K 근거를 의미적 노이즈 제거로 걸러 자연어 추론 기록을 만듭니다. 전문가별 기록을 추론–답변 쌍으로 합쳐 지도 미세 조정(SFT)에 사용합니다. 전문가 모델은 학습 자료를 구성하며, 언어 모델이 추론할 때 실시간 투표를 하거나 기여도 점수를 직접 합산하지 않습니다."],
  ["method.reasoningNote", "Model reasoning supports prediction; it is not a verified account of a respondent’s internal thoughts.", "模型推理用于支持预测，并非对受访者真实内在思维的验证性描述。", "Le raisonnement du modèle aide à prédire les réponses ; il ne constitue pas un compte rendu vérifié des pensées intérieures du répondant.", "Die Schlussfolgerungen des Modells dienen der Vorhersage; sie sind keine bestätigte Beschreibung der inneren Gedanken einer befragten Person.", "모델의 추론은 예측을 돕는 자료이며 응답자의 실제 내면 생각을 검증한 설명이 아닙니다."],
  ["flow.0.title", "Train predictive experts", "训练预测专家模型", "Entraîner les experts prédictifs", "Vorhersageexperten trainieren", "예측 전문가 모델 학습"],
  ["flow.0.body", "Train EBM, LightGBM, and MLP models on respondent data.", "用受访者数据训练 EBM、LightGBM 和 MLP。", "Entraîner EBM, LightGBM et MLP sur les données des répondants.", "EBM, LightGBM und MLP mit Befragtendaten trainieren.", "응답자 데이터로 EBM, LightGBM, MLP를 학습합니다."],
  ["flow.1.title", "Extract predictive evidence", "提取预测证据", "Extraire les indices prédictifs", "Vorhersageevidenz extrahieren", "예측 근거 추출"],
  ["flow.1.body", "Retain correct out-of-fold predictions and extract the features supporting each answer.", "保留折外预测正确的样本，提取支持每个回答的特征。", "Conserver les prédictions hors pli correctes et extraire les caractéristiques qui étayent chaque réponse.", "Korrekte Out-of-Fold-Vorhersagen behalten und die Merkmale extrahieren, die jede Antwort stützen.", "정답을 맞힌 폴드 외 예측을 남기고 각 답변을 뒷받침하는 특성을 추출합니다."],
  ["flow.2.title", "Build reasoning supervision", "构建推理监督", "Construire la supervision du raisonnement", "Schlussfolgerungsdaten erstellen", "추론 학습 자료 구성"],
  ["flow.2.body", "Filter irrelevant evidence and form natural-language reasoning records.", "过滤无关证据，形成自然语言推理记录。", "Filtrer les indices non pertinents et produire des traces de raisonnement en langue naturelle.", "Irrelevante Evidenz filtern und natürlichsprachliche Schlussfolgerungsaufzeichnungen erstellen.", "관련 없는 근거를 걸러 자연어 추론 기록을 만듭니다."],
  ["flow.3.title", "Fine-tune language models", "微调语言模型", "Affiner les modèles de langage", "Sprachmodelle feinabstimmen", "언어 모델 미세 조정"],
  ["flow.3.body", "Train language models on the resulting reasoning–answer pairs.", "使用得到的推理—回答样本训练语言模型。", "Entraîner les modèles de langage sur les paires raisonnement–réponse obtenues.", "Sprachmodelle mit den entstandenen Schlussfolgerung–Antwort-Paaren trainieren.", "생성된 추론–답변 쌍으로 언어 모델을 학습합니다."],
  ["flow.effects", "Additive effects", "加性效应", "Effets additifs", "Additive Effekte", "가산 효과"],
  ["flow.paths", "Tree-path evidence", "树路径证据", "Indices des chemins d’arbres", "Baumpfad-Evidenz", "트리 경로 근거"],
  ["flow.perturbations", "Grouped perturbations", "分组扰动", "Perturbations groupées", "Gruppierte Störungen", "그룹화된 교란"],
  ["flow.record", "Reasoning record", "推理记录", "Trace de raisonnement", "Schlussfolgerungsaufzeichnung", "추론 기록"],
  ["flow.pairs", "Combined reasoning–answer pairs", "合并后的推理—回答样本", "Paires raisonnement–réponse réunies", "Kombinierte Schlussfolgerung–Antwort-Paare", "통합된 추론–답변 쌍"],
  ["flow.sft", "Supervised fine-tuning", "监督微调", "Fine-tuning supervisé", "Überwachtes Fine-Tuning", "지도 미세 조정"],
  ["stage.0.input", "Demographics, perceptions, and survey answers", "人口统计特征、感知与调查回答", "Caractéristiques démographiques, perceptions et réponses aux enquêtes", "Demografische Merkmale, Wahrnehmungen und Umfrageantworten", "인구통계 특성, 인식 및 설문 답변"],
  ["stage.0.output", "Trained EBM, LightGBM, and MLP experts", "训练后的 EBM、LightGBM 和 MLP 专家模型", "Modèles experts EBM, LightGBM et MLP entraînés", "Trainierte Expertenmodelle EBM, LightGBM und MLP", "학습된 EBM, LightGBM, MLP 전문가 모델"],
  ["stage.1.input", "Correct OOF predictions from each expert", "各专家模型折外预测正确的样本", "Prédictions hors pli correctes de chaque expert", "Korrekte OOF-Vorhersagen jedes Expertenmodells", "전문가 모델별 정답을 맞힌 OOF 예측"],
  ["stage.1.output", "Answer-specific feature evidence", "针对具体回答的特征证据", "Indices caractéristiques propres à chaque réponse", "Antwortspezifische Merkmalsevidenz", "답변별 특성 근거"],
  ["stage.2.input", "Top-K predictive feature evidence", "Top-K 预测特征证据", "Indices prédictifs Top-K", "Top-K-Evidenz prädiktiver Merkmale", "Top-K 예측 특성 근거"],
  ["stage.2.output", "Reasoning records paired with answers", "与回答配对的推理记录", "Traces de raisonnement associées aux réponses", "Mit Antworten gepaarte Schlussfolgerungsaufzeichnungen", "답변과 짝지어진 추론 기록"],
  ["stage.3.input", "Combined reasoning–answer pairs", "合并后的推理—回答样本", "Paires raisonnement–réponse réunies", "Kombinierte Schlussfolgerung–Antwort-Paare", "결합된 추론–답변 쌍"],
  ["stage.3.output", "SocialReasoner language models", "SocialReasoner 语言模型", "Modèles de langage SocialReasoner", "SocialReasoner-Sprachmodelle", "SocialReasoner 언어 모델"],
  ["case.kicker", "A WORKED EXAMPLE · FIGURE 18", "真实案例 · 图 18", "EXEMPLE CONCRET · FIGURE 18", "KONKRETES BEISPIEL · ABBILDUNG 18", "실제 사례 · 그림 18"],
  ["case.heading", "From personal beliefs to a predicted response", "从个人信念到预测回答", "Des convictions personnelles à une réponse prédite", "Von persönlichen Überzeugungen zur vorhergesagten Antwort", "개인의 믿음에서 예측 응답까지"],
  ["case.targetLabel", "Target question", "目标题", "Question cible", "Zielfrage", "대상 질문"],
  ["case.question", "To what extent do you agree or disagree that doctors can be trusted?", "您在多大程度上同意或不同意医生是值得信任的？", "Dans quelle mesure êtes-vous d’accord ou non avec l’affirmation selon laquelle on peut faire confiance aux médecins ?", "Inwieweit stimmen Sie der Aussage zu oder nicht zu, dass man Ärzten vertrauen kann?", "의사를 신뢰할 수 있다는 말에 어느 정도 동의하거나 반대하십니까?"],
  ["case.evidence", "Relevant profile evidence", "相关画像证据", "Indices pertinents du profil", "Relevante Angaben aus dem Profil", "관련 프로필 근거"],
  ["case.shortened", "Shortened survey items. Select evidence to highlight the summary.", "问卷题意缩写。选择一条证据可高亮对应摘要。", "Formulations abrégées des questions d’enquête. Sélectionnez un indice pour mettre en évidence le résumé correspondant.", "Gekürzte Umfragefragen. Wählen Sie eine Angabe, um die entsprechende Zusammenfassung hervorzuheben.", "설문 문항의 뜻을 줄여 표기했습니다. 근거를 선택하면 해당 요약이 강조됩니다."],
  ["case.item0", "Doctors care more about earnings than patients.", "医生更关心收入而不是患者。", "Les médecins se soucient davantage de leurs revenus que des patients.", "Ärzten sind ihre Einnahmen wichtiger als die Patienten.", "의사는 환자보다 수입을 더 중요하게 생각한다."],
  ["case.item1", "Doctors’ medical skills are not as good as they should be.", "医生的医术不如应有的水平。", "Les compétences médicales des médecins ne sont pas aussi bonnes qu’elles devraient l’être.", "Die medizinischen Fähigkeiten von Ärzten sind nicht so gut, wie sie sein sollten.", "의사의 의술은 기대만큼 좋지 않다."],
  ["case.item2", "Confidence in the country’s healthcare system.", "对本国医疗卫生系统的信心。", "Confiance dans le système de santé du pays.", "Vertrauen in das Gesundheitssystem des Landes.", "자국 의료 체계에 대한 신뢰."],
  ["case.item3", "The healthcare system is inefficient.", "医疗卫生系统效率低下。", "Le système de santé est inefficace.", "Das Gesundheitssystem ist ineffizient.", "의료 체계는 비효율적이다."],
  ["case.disagree", "Disagree", "不同意", "Pas d’accord", "Stimme nicht zu", "동의하지 않음"],
  ["case.confidence", "A great deal of confidence", "非常有信心", "Une très grande confiance", "Sehr großes Vertrauen", "매우 높은 신뢰"],
  ["case.response", "Response", "回答", "Réponse", "Antwort", "응답"],
  ["case.reasoning", "Reasoning summary", "推理摘要", "Résumé du raisonnement", "Zusammenfassung der Schlussfolgerung", "추론 요약"],
  ["case.edited", "Edited summary", "编辑后的摘要", "Résumé rédigé", "Redaktionell bearbeitete Zusammenfassung", "편집된 요약"],
  ["case.motives", "The respondent rejects negative statements about doctors’ motives", "受访者否认关于医生动机", "La personne interrogée rejette les affirmations négatives sur les intentions", "Die befragte Person lehnt negative Aussagen über die Absichten", "응답자는 의사의 동기"],
  ["case.competence", " and competence", "和能力的负面说法", " et les compétences", " und Fähigkeiten", "와 능력에 관한 부정적인 진술을 거부하고"],
  ["case.system", " and reports strong confidence in the healthcare system.", "，并对医疗卫生系统有很强的信心。", " des médecins et déclare avoir une grande confiance dans le système de santé.", " von Ärzten ab und berichtet von großem Vertrauen in das Gesundheitssystem.", " 의료 체계에 강한 신뢰를 보입니다."],
  ["case.conclusion", "These views support an “Agree” response to the trust question.", "这些观点支持其对信任医生问题回答“同意”。", "Ces opinions étayent une réponse « D’accord » à la question de la confiance envers les médecins.", "Diese Ansichten stützen die Antwort „Stimme zu“ auf die Frage nach dem Vertrauen in Ärzte.", "이러한 견해는 의사 신뢰 질문에 ‘동의함’이라고 답할 근거가 됩니다."],
  ["case.predicted", "Predicted", "预测回答", "Réponse prédite", "Vorhergesagt", "예측 응답"],
  ["case.observed", "Observed", "实际回答", "Réponse observée", "Beobachtet", "실제 응답"],
  ["case.agree", "Agree", "同意", "D’accord", "Stimme zu", "동의함"],
  ["case.source", "Source: Figure 18, manuscript p. 61.", "来源：论文第 61 页图 18。", "Source : figure 18, p. 61 du manuscrit.", "Quelle: Abbildung 18, Manuskript S. 61.", "출처: 논문 원고 61쪽, 그림 18."],
  ["coverage.newHeading", "Data across societies", "跨社会的数据", "Des données issues de nombreuses sociétés", "Daten aus vielen Gesellschaften", "여러 사회의 데이터"],
  ["coverage.connection", "These filters also update the globe above. The current selection and counts are shown here.", "这里的筛选也会更新上方地球。当前选择及人数显示在本区域。", "Ces filtres mettent aussi à jour le globe ci-dessus. La sélection actuelle et les effectifs sont affichés ici.", "Diese Filter aktualisieren auch den Globus weiter oben. Die aktuelle Auswahl und die Zahlen erscheinen hier.", "이 필터는 위의 지구본도 업데이트합니다. 현재 선택과 인원 수는 여기 표시됩니다."],
  ["release.newHeading", "Code, data, and models", "代码、数据与模型", "Code, données et modèles", "Code, Daten und Modelle", "코드, 데이터 및 모델"],
  ["coverage.sectionLabel", "DATA COVERAGE", "数据覆盖范围", "COUVERTURE DES DONNÉES", "DATENABDECKUNG", "데이터 범위"],
  ["release.sectionLabel", "RESOURCES", "资源", "RESSOURCES", "RESSOURCEN", "자료"],
  ["evidence.heading", "Higher accuracy across eight datasets", "八个数据集上的准确率提升", "Une meilleure exactitude sur huit jeux de données", "Höhere Genauigkeit auf acht Datensätzen", "8개 데이터셋에서 향상된 정확도"],
  ["evidence.meanScope", "Mean accuracy across eight datasets · {model}", "八个数据集的平均准确率 · {model}", "Exactitude moyenne sur huit jeux de données · {model}", "Mittlere Genauigkeit auf acht Datensätzen · {model}", "8개 데이터셋 평균 정확도 · {model}"],
  ["evidence.points", "percentage points", "个百分点", "points de pourcentage", "Prozentpunkte", "%포인트"],
  ["evidence.relativeGainDetail", "relative gain in mean accuracy", "平均准确率相对提升", "gain relatif de l’exactitude moyenne", "relative Steigerung der mittleren Genauigkeit", "평균 정확도 상대 향상"],
  ["evidence.mainNote", "Accuracy on eight evaluation datasets (Table 1).", "八个评估数据集的准确率（表 1）。", "Exactitude sur huit jeux de données d’évaluation (tableau 1).", "Genauigkeit auf acht Evaluierungsdatensätzen (Tabelle 1).", "8개 평가 데이터셋의 정확도(표 1)."],
  ["evidence.metricDetails", "Metric details", "指标细节", "Détails des mesures", "Details zu den Kennzahlen", "지표 상세"],
  ["evidence.metricDetailsBody", "Means are arithmetic averages of the eight displayed, rounded dataset accuracies. Percentage-point change compares those means. Relative gain uses the value reported in the manuscript.", "均值是图中八个数据集已四舍五入准确率的算术平均。百分点变化比较这两个均值。相对提升沿用论文报告值。", "Les moyennes sont les moyennes arithmétiques des exactitudes arrondies affichées pour les huit jeux de données. La différence en points de pourcentage compare ces moyennes. Le gain relatif reprend la valeur rapportée dans le manuscrit.", "Die Mittelwerte sind arithmetische Mittel der acht angezeigten, gerundeten Datensatzgenauigkeiten. Die Änderung in Prozentpunkten vergleicht diese Mittelwerte. Die relative Steigerung übernimmt den im Manuskript angegebenen Wert.", "평균은 표시된 8개 데이터셋의 반올림된 정확도를 산술 평균한 값입니다. %포인트 변화는 두 평균을 비교한 결과입니다. 상대 향상은 논문 원고에 보고된 값을 그대로 사용합니다."],
  ["evidence.distributionSource", "APPENDIX B.1 / TABLE 7", "附录 B.1 / 表 7", "ANNEXE B.1 / TABLEAU 7", "ANHANG B.1 / TABELLE 7", "부록 B.1 / 표 7"],
  ["evidence.distributionTitle", "Closer to human response distributions", "更接近人类回答分布", "Plus proche des distributions de réponses humaines", "Näher an menschlichen Antwortverteilungen", "실제 응답 분포에 더 가까움"],
  ["evidence.distributionScope", "Qwen2.5-7B · mean across eight datasets", "Qwen2.5-7B · 八个数据集的均值", "Qwen2.5-7B · moyenne sur huit jeux de données", "Qwen2.5-7B · Mittel über acht Datensätze", "Qwen2.5-7B · 8개 데이터셋 평균"],
  ["evidence.distributionMetric", "Total variation distance · lower is better", "总变差距离 · 越低越好", "Distance de variation totale · plus bas est meilleur", "Totalvariationsdistanz · niedriger ist besser", "총변동거리 · 낮을수록 좋음"],
  ["evidence.unseenSource", "TABLE 2(a) / HELD-OUT GSS2022", "表 2(a) / 留出 GSS2022", "TABLEAU 2(a) / GSS2022 RÉSERVÉ", "TABELLE 2(a) / ZURÜCKGEHALTENES GSS2022", "표 2(a) / 미사용 GSS2022"],
  ["evidence.unseenTitle", "Generalizing to an unseen survey", "泛化到未见过的调查", "Généraliser à une enquête inédite", "Auf eine ungesehene Umfrage generalisieren", "학습에 쓰지 않은 조사로 일반화"],
  ["evidence.unseenTraining", "Trained on 10% of instances from each of eight source datasets; GSS2022 was not used for training.", "从八个来源数据集中各抽取 10% 实例用于训练；GSS2022 未用于训练。", "Entraînement sur 10 % des instances de chacun des huit jeux de données sources ; GSS2022 n’a pas été utilisé pour l’entraînement.", "Trainiert mit je 10 % der Fälle aus acht Quelldatensätzen; GSS2022 wurde nicht zum Training verwendet.", "8개 원본 데이터셋에서 각각 사례의 10%로 학습했으며, GSS2022는 학습에 사용하지 않았습니다."],
  ["evidence.expertSource", "FIGURE 5(b) / ATP152", "图 5(b) / ATP152", "FIGURE 5(b) / ATP152", "ABBILDUNG 5(b) / ATP152", "그림 5(b) / ATP152"],
  ["evidence.expertTitle", "Learning from complementary experts", "从互补专家模型中学习", "Apprendre d’experts complémentaires", "Von ergänzenden Experten lernen", "상호 보완적 전문가 모델에서 학습"],
  ["evidence.expertScope", "Qwen2.5-7B on ATP152. Expert sources and training records increase together.", "Qwen2.5-7B 在 ATP152 上的结果。专家来源与训练记录数量同时增加。", "Qwen2.5-7B sur ATP152. Le nombre de sources expertes et de traces d’entraînement augmente simultanément.", "Qwen2.5-7B auf ATP152. Die Anzahl der Expertenquellen und Trainingsaufzeichnungen steigt zugleich.", "ATP152에서 Qwen2.5-7B의 결과입니다. 전문가 출처와 학습 기록 수가 함께 늘어납니다."],
  ["evidence.expertAxis", "Accuracy (%) · local 62–64 axis", "准确率（%）· 局部纵轴 62–64", "Exactitude (%) · axe local de 62 à 64", "Genauigkeit (%) · lokaler Maßstab 62–64", "정확도(%) · 62–64 구간 축"],
  ["evidence.expertChartAria", "ATP152 accuracy rises from 62.31 to 63.41 percent across five expert combinations on a labeled 62 to 64 percent axis.", "在标明 62% 至 64% 的局部纵轴上，ATP152 五种专家组合的准确率从 62.31% 增至 63.41%。", "Sur un axe local de 62 à 64 %, l’exactitude sur ATP152 passe de 62,31 à 63,41 % pour cinq combinaisons d’experts.", "Auf einer gekennzeichneten lokalen Achse von 62 bis 64 Prozent steigt die ATP152-Genauigkeit über fünf Expertenkombinationen von 62,31 auf 63,41 Prozent.", "62%에서 64%까지 표시한 구간 축에서 ATP152의 정확도는 5개 전문가 조합에 걸쳐 62.31%에서 63.41%로 높아집니다."],
  ["evidence.expertRecords", "{count} reasoning records", "{count} 条推理记录", "{count} traces de raisonnement", "{count} Schlussfolgerungsaufzeichnungen", "추론 기록 {count}개"],
  ["evidence.expertFoot", "The highlighted third point is the three-expert configuration used in the main method. The fourth and fifth points are expansion experiments.", "高亮的第三个点是主要方法中的三专家配置。第四、第五个点为扩展实验。", "Le troisième point mis en évidence correspond à la configuration à trois experts de la méthode principale. Les quatrième et cinquième points représentent des expériences d’extension.", "Der hervorgehobene dritte Punkt zeigt die Dreiexperten-Konfiguration der Hauptmethode. Der vierte und fünfte Punkt stammen aus Erweiterungsexperimenten.", "강조된 세 번째 점은 주요 방법의 3전문가 구성입니다. 네 번째와 다섯 번째 점은 확장 실험입니다."],
  ["hero.sampledRegion", "Sampled region", "有样本地区", "Région avec échantillon", "Region mit Stichprobe", "표본이 있는 지역"],
  ["hero.selectedRegion", "Selected region", "选中地区", "Région sélectionnée", "Ausgewählte Region", "선택한 지역"],
  ["hero.pathways", "Expert pathways · training supervision", "专家路径 · 训练监督", "Parcours des experts · supervision de l’entraînement", "Expertenpfade · Trainingssignale", "전문가 경로 · 학습 감독 자료"],
  ["case.clear", "Clear selection", "清除选择", "Effacer la sélection", "Auswahl aufheben", "선택 해제"],
  ["case.interactionHint", "Select or focus evidence to trace its reasoning.", "选择或聚焦一条证据，查看对应的推理。", "Sélectionnez un indice ou placez-y le focus pour suivre le raisonnement associé.", "Wählen oder fokussieren Sie einen Beleg, um die zugehörige Schlussfolgerung zu verfolgen.", "근거를 선택하거나 초점을 맞춰 연결된 추론을 확인하세요."],
  ["case.predictionLabel", "SocialReasoner prediction", "SocialReasoner 预测", "Prédiction de SocialReasoner", "SocialReasoner-Vorhersage", "SocialReasoner 예측"],
  ["journey.aria", "Five-stage method demonstration", "五阶段方法演示", "Démonstration de la méthode en cinq étapes", "Fünfstufige Methodendemonstration", "5단계 방법 시연"],
  ["journey.indexAria", "Method stages", "方法阶段", "Étapes de la méthode", "Methodenschritte", "방법 단계"],
  ["journey.expertsAria", "Expert paths: EBM, LightGBM, MLP", "专家路径：EBM、LightGBM、MLP", "Parcours experts : EBM, LightGBM, MLP", "Expertenpfade: EBM, LightGBM, MLP", "전문가 경로: EBM, LightGBM, MLP"],
  ["journey.continue", "Explore the case ↘", "探索案例 ↘", "Explorer le cas ↘", "Beispiel erkunden ↘", "사례 살펴보기 ↘"],
  ["journey.0.title", "Human responses", "受访者回答", "Réponses humaines", "Antworten von Befragten", "사람의 응답"],
  ["journey.1.title", "Heterogeneous experts", "异构专家模型", "Experts hétérogènes", "Unterschiedliche Expertenmodelle", "서로 다른 전문가 모델"],
  ["journey.2.title", "Predictive evidence", "预测证据", "Indices prédictifs", "Prädiktive Evidenz", "예측 근거"],
  ["journey.3.title", "Reasoning supervision", "推理监督", "Supervision du raisonnement", "Schlussfolgerungsdaten", "추론 학습 자료"],
  ["journey.0.body", "Demographics, perceptions, and a target question form the model input. The observed answer is used during training.", "人口统计特征、感知与目标题构成模型输入。真实回答仅在训练时使用。", "Les caractéristiques démographiques, les perceptions et une question cible forment l’entrée du modèle. La réponse observée sert à l’entraînement.", "Demografie, Wahrnehmungen und Zielfrage bilden die Modelleingabe. Die beobachtete Antwort wird beim Training verwendet.", "인구통계 특성, 인식, 목표 문항이 모델 입력을 이룹니다. 관측 답변은 학습에만 사용합니다."],
  ["journey.1.body", "EBM, LightGBM, and MLP learn separately from respondent data.", "EBM、LightGBM 和 MLP 分别从受访者数据中学习。", "EBM, LightGBM et MLP apprennent séparément à partir des données des répondants.", "EBM, LightGBM und MLP lernen getrennt aus den Befragtendaten.", "EBM, LightGBM, MLP는 응답자 데이터에서 각각 학습합니다."],
  ["journey.2.body", "Correct out-of-fold predictions yield answer-specific, Top-K feature evidence from each expert.", "各专家模型折外预测正确的样本提供对应回答的 Top-K 特征证据。", "Les prédictions correctes hors pli fournissent, pour chaque expert, les Top-K caractéristiques étayant chaque réponse.", "Korrekte Out-of-Fold-Vorhersagen liefern aus jedem Expertenmodell antwortspezifische Top-K-Merkmalsevidenz.", "폴드 외 예측이 정답인 사례에서 전문가별 답변 관련 Top-K 특성 근거를 얻습니다."],
  ["journey.3.body", "Semantic denoising filters irrelevant evidence. Each expert forms its own reasoning–answer records.", "语义去噪过滤无关证据。各专家分别形成自己的推理—回答记录。", "Le débruitage sémantique filtre les indices non pertinents. Chaque expert produit ses propres traces raisonnement–réponse.", "Semantische Rauschfilterung entfernt irrelevante Evidenz. Jedes Expertenmodell erzeugt eigene Schlussfolgerung–Antwort-Aufzeichnungen.", "의미적 노이즈 제거로 관련 없는 근거를 걸러냅니다. 각 전문가가 자체 추론–답변 기록을 만듭니다."],
  ["journey.4.body", "The records join a training pool for supervised fine-tuning. The resulting language model predicts responses on its own.", "各专家记录汇入训练数据，用于监督微调。得到的语言模型独立预测回答。", "Les traces rejoignent un ensemble d’entraînement pour le fine-tuning supervisé. Le modèle de langage obtenu prédit ensuite les réponses seul.", "Die Aufzeichnungen bilden gemeinsame Trainingsdaten für überwachtes Fine-Tuning. Das entstandene Sprachmodell sagt Antworten eigenständig voraus.", "기록을 하나의 학습 데이터로 모아 지도 미세 조정합니다. 완성된 언어 모델이 독립적으로 답변을 예측합니다."],
  ["journey.input", "Structured survey input", "结构化调查输入", "Entrée d’enquête structurée", "Strukturierte Umfragedaten", "구조화된 설문 입력"],
  ["journey.demographics", "Demographics", "人口统计特征", "Données démographiques", "Demografische Angaben", "인구통계 특성"],
  ["journey.perceptions", "Perceptions", "个人感知", "Perceptions", "Wahrnehmungen", "인식"],
  ["journey.question", "Target question", "目标题", "Question cible", "Zielfrage", "목표 문항"],
  ["journey.inputNote", "Known at prediction time", "预测时可用", "Disponibles lors de la prédiction", "Bei der Vorhersage bekannt", "예측 시 사용 가능"],
  ["journey.evidence", "Relevant features", "相关特征", "Caractéristiques pertinentes", "Relevante Merkmale", "관련 특성"],
  ["journey.oof", "Correct OOF predictions · Top-K", "正确的 OOF 预测 · Top-K", "Prédictions OOF correctes · Top-K", "Korrekte OOF-Vorhersagen · Top-K", "정답 OOF 예측 · Top-K"],
  ["journey.trainingOnly", "Observed answer · training only", "真实回答 · 仅用于训练", "Réponse observée · entraînement seul", "Beobachtete Antwort · nur Training", "관측 답변 · 학습 전용"],
  ["journey.sft", "SFT", "监督微调", "Fine-tuning supervisé", "Überwachtes Fine-Tuning", "지도 미세 조정"],
  ["journey.modelNote", "One trained language model", "一个训练后的语言模型", "Un seul modèle de langage entraîné", "Ein trainiertes Sprachmodell", "학습된 하나의 언어 모델"],
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
