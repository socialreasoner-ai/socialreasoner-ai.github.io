/* The globe and method explorer share exact records from the released test sets. */
(() => {
  let request;
  function load() {
    if (!request) {
      request = fetch('assets/behavioral-examples.json?v=20261124-ood-v1')
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

  // The display slots keep their illustrative artwork as the test sample changes.
  const artworkByDisplayId = {
    'CPS-A': 'ATP152_P0004934',
    'CPS-B': 'ATP142_P0007673',
    'SDI-A': 'EVS2017_P0015007',
    'SDI-B': 'ATP152_P0004761',
    'VAPP-A': 'ISSP2015_P0010896',
    'VAPP-B': 'ATP142_P0004968'
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
          avatar: artwork.get(artworkByDisplayId[person.displayId]), avatarIllustrative: true,
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
