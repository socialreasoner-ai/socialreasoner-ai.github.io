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

  function globeGroup(group) {
    return {
      datasetId: group.datasetId, label: group.name, availability: 'ready',
      participants: group.participants.map((person, index) => {
        const record = person.records[0];
        return {
          datasetId: group.datasetId, displayId: person.displayId, regionId: person.regionId,
          demographics: person.demographics, perceptions: person.perceptions,
          avatar: { posterPath: `assets/avatars/participant-${index ? 'b' : 'a'}.svg` }, avatarIllustrative: true,
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
        return { id: person.displayId,
          labelFields: { age: fields.age, country: fields.country, gender: fields.sex, education: fields.education_level },
          records: person.records.map(record => ({ id: record.questionId, questionId: record.questionId,
            question: record.question, options: record.options, perceptions, observedId: record.answerId, inputPrompt: record.prompt }))
        };
      })
    };
  }
  window.SocialBehavioralExamples = { load, globeGroup, methodGroup };
})();
