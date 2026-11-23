/* The globe and method explorer share exact records from the released test sets. */
(() => {
  let request;
  function load() {
    if (!request) {
      request = fetch('assets/behavioral-examples.json?v=20261123')
        .then(response => {
          if (!response.ok) throw new Error('Behavioral test examples unavailable');
          return response.json();
        })
        .then(data => {
          if (data.schemaVersion !== 1 || !Array.isArray(data.datasets)) throw new Error('Invalid behavioral examples');
          return data.datasets;
        })
        .catch(error => {
          console.warn('Behavioral test examples unavailable:', error);
          return [];
        });
    }
    return request;
  }

  // Link each released test respondent to an illustration, independently of list order.
  const artworkByRespondent = {
    r4d8ed77f74863f7f: 'ATP152_P0004934',
    r5d0745a3fdbe49e8: 'ATP142_P0007673',
    r84263a7ac70caf9c: 'EVS2017_P0015007',
    r78d36a55e601e6d6: 'ATP152_P0004761',
    r52ffdbb12461a48e: 'ISSP2015_P0010896',
    rd93c3389cde4bd77: 'ATP142_P0004968'
  };

  function globeGroup(group, showcase) {
    const artwork = new Map(showcase.datasets.flatMap(dataset =>
      dataset.participants.map(person => [person.sourceRef.recordKey, person.avatar])));
    return {
      datasetId: group.datasetId, label: group.name, availability: 'ready',
      participants: group.participants.map(person => {
        const record = person.records[0];
        return {
          datasetId: group.datasetId, displayId: person.displayId, regionId: person.regionId,
          demographics: person.demographics, perceptions: person.perceptions,
          avatar: artwork.get(artworkByRespondent[person.respondentId]), avatarIllustrative: true,
          target: { questionId: record.questionId, question: record.question,
            options: Object.entries(record.options).map(([id, text]) => ({ id, text })) },
          observedOptionId: record.answerId, inputPrompt: record.prompt
        };
      })
    };
  }

  function methodGroup(group) {
    return {
      id: group.datasetId, label: `${group.name} · ${group.datasetId}`, sourceType: 'testResponse',
      profiles: group.participants.map(person => {
        const fields = Object.fromEntries(person.demographics.map(field => [field.key, field.value]));
        const perceptions = person.perceptions.map(item => ({ question: item.question, response: item.value }));
        return { id: person.displayId, regionId: person.regionId, demographics: person.demographics,
          labelFields: { age: fields.age, country: fields.country, gender: fields.sex, education: fields.education_level },
          records: person.records.map(record => ({ id: record.questionId, questionId: record.questionId,
            question: record.question, options: record.options, perceptions, observedId: record.answerId, inputPrompt: record.prompt }))
        };
      })
    };
  }
  window.SocialBehavioralExamples = { load, globeGroup, methodGroup };
})();
