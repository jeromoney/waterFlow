'''
Input: a large selection of geometry objects
Output: a maximum zoom property attached to each object that drops objects with lesser property values.
'''

import numpy as np
from flowCalulator import connect2db

def get_tiles(extent,zoom, box_slice = 5,start_zoom = 4):
    '''Returns a tiled selection of squares covering an extent.
       box_slice: Slice in x and y direction so 4 total. there should be 4 times as many bounding boxes per zoom
    '''
    x_min = extent[0][0]
    x_max = extent[0][1]
    y_min = extent[1][0]
    y_max = extent[1][1]

    # the step size is the same in x and y. It needs to be reduced by 2 per zoom
    step_size  = box_slice * 2 ** (start_zoom - zoom)
    x_slice = np.arange(x_min, x_max + step_size, step_size)
    y_slice = np.arange(y_min, y_max + step_size, step_size)
    tiles = []
    for x in x_slice:
        for y in y_slice:
            tiles.append('ST_MakeEnvelope({}, {}, {},{},4326)'.format(x,y,x + step_size,y + step_size))
    return tiles


def main():
    GEOM_LIMIT = 5 # number of objects to show per zoom.
    LOWER48_EXTENT = [(-125,-66),(24,50)]
    cursor, conn = connect2db()
    query = 'SELECT id from gauge'
    cursor.execute(query)
    gauges = {x[0]: 11 for x in cursor.fetchall()}


    # zoom level 4: USA
    # zoom level 11: a city, all points should be visible
    for zoom in range(4,10+1):
        print 'working on zoom level {}'.format(zoom)
        # get a tiled selection of bounding boxes covering range
        tiles = get_tiles(LOWER48_EXTENT,zoom)
        # run a query per tile
        for box in tiles:
            query = '''SELECT gauge.id
                            FROM gauge
                            JOIN data ON data.gauge = id
                            WHERE ST_Intersects(geom,  {})
                            ORDER BY value desc
                            LIMIT {}'''.format(box,GEOM_LIMIT)
            cursor.execute(query)
            results = [x[0] for x in cursor.fetchall()]
            for gauge in results:
                gauges[gauge] = min(gauges[gauge], zoom)
    cursor.execute("TRUNCATE gauge_zoom")
    for gauge in gauges.keys():
        query = "insert into gauge_zoom values ($${}$$, {})".format(gauge, gauges[gauge])
        cursor.execute(query)
    conn.commit()

if __name__ == "__main__":
    main()