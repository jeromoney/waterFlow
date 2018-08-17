'''
Input: a large selection of geometry objects
Output: a maximum zoom property attached to each object that drops objects with lesser property values.
'''

import numpy as np
from flowCalulator import connect2db

def get_tiles(tiles):
    '''Returns a tiled selection of squares covering an extent.
       box_slice: Slice in x and y direction so 4 total. there should be 4 times as many bounding boxes per zoom
    '''
    out_tiles = []
    for tile in tiles:
        # splits tiles into 4
        x_min = tile[0][0]
        x_max = tile[0][1]
        y_min = tile[1][0]
        y_max = tile[1][1]
        for i in range(2):
            for j in range(2):
                new_x_min = x_min + i * (x_max - x_min) / 2
                new_y_min = y_min + j * (y_max - y_min) / 2
                new_x_max = x_min + (i + 1) * (x_max - x_min) / 2
                new_y_max = y_min + (j + 1) * (y_max - y_min) / 2
                out_tiles.append([(new_x_min,new_x_max),(new_y_min,new_y_max)])
    return out_tiles

def main():
    GEOM_LIMIT = 5 # number of objects to show per zoom.
    LOWER48_EXTENT = [[(-125.,-66.),(24.,50.)]]
    tiles = get_tiles(LOWER48_EXTENT)
    cursor, conn = connect2db()
    query = 'SELECT id from gauge'
    cursor.execute(query)
    gauges = {x[0]: 11 for x in cursor.fetchall()}


    # zoom level 4: USA
    # zoom level 11: a city, all points should be visible
    for zoom in range(4,10+1): #should be 10
        print 'working on zoom level {}'.format(zoom)
        # get a tiled selection of bounding boxes covering range
        tiles = get_tiles(tiles)
        # run a query per tile
        empty_tiles = []
        for box in tiles:
            empty_tiles = []
            box_text = 'ST_MakeEnvelope({}, {}, {},{},4326)'.format(box[0][0],box[1][0],box[0][1],box[1][1])
            query = '''SELECT gauge.id
                            FROM gauge
                            JOIN data ON data.gauge = id
                            WHERE ST_Intersects(geom,  {})
                            ORDER BY value desc
                            LIMIT {}'''.format(box_text,GEOM_LIMIT)
            cursor.execute(query)
            results = [x[0] for x in cursor.fetchall()]
            if results == []:
                empty_tiles.append(box)
            for gauge in results:
                gauges[gauge] = min(gauges[gauge], zoom)
            for empty_tile in empty_tiles:
                # remove empty_tiles to speed up computation (i.e. if no objects are in tile, then there still won't be objects if it is split into 4.
                tiles.remove(empty_tile)


    cursor.execute("TRUNCATE gauge_zoom")
    for gauge in gauges.keys():
        query = "insert into gauge_zoom values ($${}$$, {})".format(gauge, gauges[gauge])
        cursor.execute(query)
    conn.commit()

if __name__ == "__main__":
    main()