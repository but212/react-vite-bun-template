import { gql, useQuery } from '@apollo/client';

const GET_LAUNCHES = gql`
  query GetLaunches {
    launches(limit: 5) {
      mission_name
      launch_date_local
      launch_site {
        site_name_long
      }
    }
  }
`;

const Launches = () => {
  const { loading, error, data } = useQuery(GET_LAUNCHES);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  return (
    <div>
      <h2 className='text-2xl font-bold mb-4'>SpaceX Launches</h2>
      <ul>
        {data.launches.map((launch: any) => (
          <li key={launch.mission_name} className='mb-2 p-2 border rounded'>
            <h3 className='font-bold'>{launch.mission_name}</h3>
            <p>Date: {new Date(launch.launch_date_local).toLocaleDateString()}</p>
            <p>Site: {launch.launch_site.site_name_long}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Launches;
