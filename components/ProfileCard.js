export default function ProfileCard({ profile }) {
  return (
    <>
      <img className="card-photo" src={profile.photoUrl} alt={`Photo of ${profile.name}`} draggable={false} />
      <div className="card-info">
        <h2>
          {profile.name}, <span>{profile.age}</span>
        </h2>
        <p className="card-place">{profile.place}</p>
        <p className="card-bio">{profile.bio}</p>
        <ul className="chips">
          {profile.interests.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
