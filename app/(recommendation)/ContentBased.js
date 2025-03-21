export const contentBasedMatch = (currentUser, users) => {
  // Filter for full matches where both conditions are true
  const fullMatches = users.filter((user) => {
    const userCanTeachCurrent = user.teach?.some((subject) =>
      currentUser.learn?.includes(subject)
    );
    const currentCanTeachUser = currentUser.teach?.some((subject) =>
      user.learn?.includes(subject)
    );
    return userCanTeachCurrent && currentCanTeachUser;
  });

  // If there are any full matches, return them
  if (fullMatches.length > 0) {
    return fullMatches;
  }

  // Otherwise, return one-way matches (where at least one condition is true)
  return users.filter((user) => {
    const userCanTeachCurrent = user.teach?.some((subject) =>
      currentUser.learn?.includes(subject)
    );
    const currentCanTeachUser = currentUser.teach?.some((subject) =>
      user.learn?.includes(subject)
    );
    return userCanTeachCurrent || currentCanTeachUser;
  });
};

export default contentBasedMatch;