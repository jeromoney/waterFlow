'''
Populates a network of unknown stream flows from a sparse data.
'''
RECURSION_LIMIT = 8000


import psycopg2,sys,os

def connect2db():
    db_name = os.environ.get('DB_NAME')
    db_user = os.environ.get('DB_USER')
    db_pass = os.environ.get('DB_PASS')
    conn_string = f"host='localhost' dbname='{db_name}' user='{db_user}' password='{db_pass}'"
    # print the connection string we will use to connect
    "Connecting to database\n	->%s" % (conn_string)

    # get a connection, if a connect cannot be made an exception will be raised here
    conn = psycopg2.connect(conn_string)

    # conn.cursor will return a cursor object, you can use this cursor to perform queries
    return conn.cursor(),conn

def get_head_nodes(cursor):
    cursor.execute("SELECT watersource FROM py_head_nodes")
    data = cursor.fetchall()
    return {datum[0] for datum in data}

def get_analyzed_headnodes(cursor):
    cursor.execute("SELECT hydroseq FROM analyzed_terminal_streams")
    data = cursor.fetchall()
    return [datum[0] for datum in data]

def get_bad_nodes(cursor):
    cursor.execute("SELECT badnode FROM bad_nodes")
    data = cursor.fetchall()
    return {datum[0] for datum in data}

def get_upstream_map(cursor):
    cursor.execute("SELECT hydroseq,array_agg FROM py_upstreammap") # changed this from materialized to normal view
    return dict(cursor.fetchall())

def get_gauges(cursor):
    cursor.execute("SELECT watersource FROM py_gauges") # switch to normal view.
    return [x[0] for x in cursor.fetchall()]

def flow(node):
    '''
    :param node:
    :return:
    Recursive function that identifies all gauges that feed into river segment
    '''
    # get streams that flow directly into segment
    upstream_nodes = upstream_map.get(node, [])


    # Case 1: River segment is a headwater so assume zero flow
    if upstream_nodes == []:
        return []

    #deleting record for speed
    del upstream_map[node]

    # Case 2: River segment has a gauge. The flow is simply the gauge value
    if node in gauges:
        node_flow_ids.append((node,[node]))
        # continue search upstream
        for upstream_node in upstream_nodes:
            flow(upstream_node)
        return [node]

    # Case 3: River flow is the sum of all the upstream segments leading directly to it.
    flow_gauges = []
    for upstream_node in upstream_nodes:
        flow_gauges += flow(upstream_node)
    node_flow_ids.append((node, flow_gauges))
    return flow_gauges

# Get the flow information from database
def main():
    cursor,conn = connect2db()
    # this script runs deep recursion to walk up each stream. setting recursion limit higher than normal
    sys.setrecursionlimit(RECURSION_LIMIT)
    #reset old flow readings
    cursor.execute("TRUNCATE node_flow")
    cursor.execute("TRUNCATE analyzed_terminal_streams")
    conn.commit()

    # get final downstream rivers
    global destination_line
    destination_line = get_head_nodes(cursor)

    # hackish solution. these nodes are causing the algo to run wild along coast lines.
    destination_line -= get_bad_nodes(cursor)

    print(f"number of nodes to analyze: {len(destination_line)}")
    # get network of rivers
    global upstream_map
    upstream_map = get_upstream_map(cursor)

    # get a listing of gauges with hydroseq matches
    global gauges
    gauges = get_gauges(cursor)

    global node_flow_ids
    node_flow_ids = []
    #
    # for each final destination search upstream
    # The flow is the sum of the all incoming streams
    # go upstream looking for gauge
    # The final result is a river seqment with a list of all gauges for the section
    for destination in destination_line:
        print(f"Working on {destination}")
        # i need the flow for upstream nodes, not the node itself
        for node in upstream_map.get(destination, []):
            flow(node)
        print("Executing SQL")
        cursor.execute( \
            "INSERT INTO analyzed_terminal_streams VALUES (%s,%s)", \
            (destination, False))
        for node, gaugexx in node_flow_ids:
            for gauge in gaugexx:
                cursor.execute( \
                    "INSERT INTO node_flow VALUES (%s, %s, %s)", \
                    (node, gauge, destination))

        conn.commit()
        node_flow_ids = []



if __name__ == "__main__":
    main()
